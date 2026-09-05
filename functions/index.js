const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const Anthropic = require('@anthropic-ai/sdk');

admin.initializeApp({
  storageBucket: 'legalai-48c30.firebasestorage.app'
});
const db = getFirestore();
const bucket = getStorage().bucket();
// A raw @google-cloud/storage client, freshly instantiated, always targets real
// Google Cloud Storage -- unlike the Admin SDK's `bucket` above, which the local
// Functions emulator silently redirects to the local Storage emulator. Document
// AI's batch API is a real external Google service and can only see real Cloud
// Storage objects, so anything it needs must go through this client instead.
const { Storage: GCSStorage } = require('@google-cloud/storage');
const realBucket = new GCSStorage({ apiEndpoint: 'https://storage.googleapis.com' }).bucket(bucket.name);

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const DOCAI_LOCATION = process.env.DOCAI_LOCATION || 'us';
const DOCAI_PROCESSOR_ID = process.env.DOCAI_PROCESSOR_ID;

// Claude's PDF/image request payload cap is 32MB, and base64 encoding inflates a raw
// file by roughly a third — so we stay well under that when deciding whether to send
// the actual document to Claude alongside the OCR text.
const MAX_BYTES_FOR_CLAUDE_VISION = 24 * 1024 * 1024;

const docAiClient = new DocumentProcessorServiceClient({
  apiEndpoint: `${DOCAI_LOCATION}-documentai.googleapis.com`,
});

/**
 * Confirms the calling user is actually on this matter (partner, junior, or client)
 * before we touch any documents. Mirrors the check in firestore.rules — we can't
 * rely on client-side rules alone since this function runs with admin privileges.
 */
async function assertOnMatter(uid, matterId) {
  const matterRef = db.doc(`matters/${matterId}`);
  const matterSnap = await matterRef.get();

  // Local-testing convenience only: real auth/matter-creation isn't built yet, so
  // there's no way to have a legitimate matter with a signed-in user attached. In the
  // emulator (never in production — see the FUNCTIONS_EMULATOR check), auto-create a
  // demo matter owned by whoever is signed in, so the OCR -> Claude pipeline can be
  // tested end to end. Delete this whole isEmulator block once real matter creation
  // (a partner picking a client + junior) exists.
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  if (!matterSnap.exists && isEmulator) {
    const demoMatter = {
      partnerId: uid,
      juniorId: uid,
      clientId: uid,
      clientName: 'Demo Client (emulator)',
      status: 'draft',
      createdAt: FieldValue.serverTimestamp(),
    };
    await matterRef.set(demoMatter);
    return demoMatter;
  }

  if (!matterSnap.exists) {
    throw new HttpsError('not-found', `Matter ${matterId} does not exist.`);
  }
  const matter = matterSnap.data();
  const allowed = [matter.partnerId, matter.juniorId, matter.clientId].includes(uid);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'You are not on this matter.');
  }
  return matter;
}

/** Downloads the uploaded file from Storage once, for both OCR and Claude to use. */
async function downloadFile(storagePath) {
  const file = bucket.file(storagePath);
  const [buffer] = await file.download();
  const [metadata] = await file.getMetadata();
  return { buffer, contentType: metadata.contentType || 'application/pdf' };
}

/**
 * Runs the file through Document AI's synchronous processDocument call.
 * NOTE: capped at 15 pages by Document AI itself. We're intentionally back on
 * this for now while a batch-processing permission issue (storage.objects.get
 * denied despite verified-correct IAM at bucket and project level) is being
 * investigated with Google Cloud Support. Once resolved, swap back to the
 * batch version to remove this page limit -- see git history / chat log for
 * that implementation.
 */
async function runOcr(buffer, contentType) {
  const name = `projects/${GCP_PROJECT_ID}/locations/${DOCAI_LOCATION}/processors/${DOCAI_PROCESSOR_ID}`;
  const [result] = await docAiClient.processDocument({
    name,
    rawDocument: {
      content: buffer.toString('base64'),
      mimeType: contentType,
    },
  });
  return result.document?.text || '';
}
/**
 * Sends the actual document (PDF or image, via Claude's native vision) PLUS the
 * Document AI OCR text to Claude, and asks for strict JSON back.
 *
 * We send both because they're complementary, not redundant: OCR text is fast,
 * cheap, and fully searchable/storable, but it flattens everything to a single text
 * stream and can badly mangle handwriting, stamps, cursive margin notes, and older
 * or degraded regional-language typefaces — exactly the failure mode a real property
 * file will hit constantly. Claude's vision reads the page the way a person would,
 * so we let it use the OCR text as a rough first draft but explicitly prioritize
 * what it can see directly in the document itself.
 */
async function analyzeWithClaude(buffer, contentType, ocrText, fileName) {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

  const systemPrompt = `You are assisting a junior advocate at an Indian property law firm.
You will be given a property document (sale deed, gift deed, RTC, encumbrance
certificate, affidavit, etc.) in two forms:
1. The actual document itself (PDF or image) — read this directly, the way a person
   would, including any handwritten notes, stamps, cursive annotations, or
   regional-language (e.g. Kannada) text.
2. A rough OCR transcription of the same document, which may be badly garbled —
   especially for handwriting, older typefaces, poor scan quality, or mixed-script
   pages. Treat the OCR text as a rough first draft only.

Where the OCR text and what you can see in the document itself disagree — especially
for names, dates, survey numbers, or handwritten margin notes — trust what you can
read directly in the document. If a detail (like a party's name) is genuinely
illegible even to you, say so explicitly in "flags" rather than guessing.`;

  const content = [];

  if (buffer.length <= MAX_BYTES_FOR_CLAUDE_VISION) {
    const isPdf = contentType === 'application/pdf';
    content.push({
      type: isPdf ? 'document' : 'image',
      source: {
        type: 'base64',
        media_type: contentType,
        data: buffer.toString('base64'),
      },
    });
  }

  content.push({
    type: 'text',
    text: `File name: ${fileName}\n\nOCR text (rough draft, may contain errors — see system instructions):\n${ocrText}`,
  });

  // Forcing a tool call, rather than asking Claude to write raw JSON text,
  // guarantees a valid structured object back -- no JSON.parse() needed, and no
  // risk of a stray unescaped quote or apostrophe in a document's text (very
  // common in these documents -- names, survey references, etc.) breaking parsing.
  const recordAnalysisTool = {
    name: 'record_document_analysis',
    description: 'Records the structured analysis of a single property document.',
    input_schema: {
      type: 'object',
      properties: {
        docType: { type: 'string', description: "Short label, e.g. 'Sale Deed', 'Gift Deed', 'RTC'" },
        brief: { type: 'string', description: '2-4 sentence plain-English summary of what this document establishes' },
        chainOfTitle: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'DD-MM-YYYY or best guess' },
              instrument: { type: 'string', description: "e.g. Sale Deed No. 4830/1994-95" },
              effect: { type: 'string', description: 'Who transferred to whom, briefly' },
            },
            required: ['date', 'instrument', 'effect'],
          },
        },
        missingDocs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific documents or checks a junior should chase, given what THIS document references but does not include',
        },
        flags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Anything inconsistent, incomplete, legally risky, or illegible in this document',
        },
      },
      required: ['docType', 'brief', 'chainOfTitle', 'missingDocs', 'flags'],
    },
  };

  const message = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8192,
    system: systemPrompt,
    tools: [recordAnalysisTool],
    tool_choice: { type: 'tool', name: 'record_document_analysis' },
    messages: [{ role: 'user', content }],
  });

  const toolUse = message.content.find((block) => block.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Claude did not return the expected structured analysis.');
  }
  return toolUse.input;
}

exports.analyzeDocument = onCall(
  { secrets: [ANTHROPIC_API_KEY], region: 'asia-south1', timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const { matterId, storagePath, fileName } = request.data || {};
    if (!matterId || !storagePath || !fileName) {
      throw new HttpsError('invalid-argument', 'matterId, storagePath, and fileName are required.');
    }

    await assertOnMatter(request.auth.uid, matterId);

    const { buffer, contentType } = await downloadFile(storagePath);
    const ocrText = await runOcr(buffer, contentType);
    const analysis = await analyzeWithClaude(buffer, contentType, ocrText, fileName);

    const docRef = await db.collection(`matters/${matterId}/documents`).add({
      fileName,
      storagePath,
      docType: analysis.docType,
      ocrText,
      uploadedBy: request.auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    await db.collection(`matters/${matterId}/analysis`).add({
      documentId: docRef.id,
      brief: analysis.brief,
      chainOfTitle: analysis.chainOfTitle,
      missingDocs: analysis.missingDocs,
      flags: analysis.flags,
      createdAt: FieldValue.serverTimestamp(),
    });

    return analysis;
  }
);

/**
 * Synthesizes all per-document analyses on a matter into one overall title
 * assessment: a single narrative brief, a merged/deduped chain of title, a
 * consolidated missing-docs list, and flags that include cross-document
 * contradictions (not just single-document issues).
 */
async function synthesizeMatterAssessment(docs) {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

  const systemPrompt = `You are assisting a junior advocate at an Indian property law firm.
You will be given the individual analyses of every document uploaded so far for one
property matter (deeds, RTCs, encumbrance certificates, consent letters, etc.), each
with its own docType, brief, chain of title, missing docs, and flags.

Your job is to synthesize these into ONE overall title assessment for the property as
a whole -- not just concatenate them. Specifically:
- Merge and order the chain of title chronologically across ALL documents, resolving
  duplicates (the same transfer often appears in more than one document).
- Note where one document's "missing" item is actually answered by another uploaded
  document, and drop it from the overall missing list in that case.
- Flag contradictions BETWEEN documents (e.g. different extents, different owner
  names, a sale deed date that doesn't match what a later document assumes) as their
  own flags -- these matter more than single-document issues.
- Give an overall plain-English brief (4-6 sentences) of what the full document set
  currently establishes about this property's title, and what is still open.`;

  const docsSummary = docs.map((d, i) => (
    `Document ${i + 1}: ${d.fileName}\n` +
    `Type: ${d.docType || 'Unknown'}\n` +
    `Brief: ${d.brief || ''}\n` +
    `Chain of title: ${JSON.stringify(d.chainOfTitle || [])}\n` +
    `Missing docs noted: ${JSON.stringify(d.missingDocs || [])}\n` +
    `Flags: ${JSON.stringify(d.flags || [])}`
  )).join('\n\n---\n\n');

  const recordAssessmentTool = {
    name: 'record_overall_assessment',
    description: 'Records the synthesized overall title assessment across all documents in the matter.',
    input_schema: {
      type: 'object',
      properties: {
        overallBrief: { type: 'string', description: "4-6 sentence plain-English summary of the property's title position based on all documents so far" },
        chainOfTitle: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              instrument: { type: 'string' },
              effect: { type: 'string' },
              source: { type: 'string', description: 'Which uploaded file this comes from' },
            },
            required: ['date', 'instrument', 'effect', 'source'],
          },
        },
        missingDocs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Still-outstanding documents or checks, after accounting for what is already uploaded',
        },
        flags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Cross-document contradictions first, then any remaining single-document issues worth carrying forward',
        },
      },
      required: ['overallBrief', 'chainOfTitle', 'missingDocs', 'flags'],
    },
  };

  const message = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8192,
    system: systemPrompt,
    tools: [recordAssessmentTool],
    tool_choice: { type: 'tool', name: 'record_overall_assessment' },
    messages: [{ role: 'user', content: docsSummary }],
  });

  const toolUse = message.content.find((block) => block.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Claude did not return the expected structured assessment.');
  }
  return toolUse.input;
}
exports.generateMatterAssessment = onCall(
  { secrets: [ANTHROPIC_API_KEY], region: 'asia-south1', timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const { matterId } = request.data || {};
    if (!matterId) {
      throw new HttpsError('invalid-argument', 'matterId is required.');
    }

    await assertOnMatter(request.auth.uid, matterId);

    const [documentsSnap, analysisSnap] = await Promise.all([
      db.collection(`matters/${matterId}/documents`).get(),
      db.collection(`matters/${matterId}/analysis`).get(),
    ]);

    if (analysisSnap.empty) {
      throw new HttpsError('failed-precondition', 'No analyzed documents found for this matter yet.');
    }

    const fileNameById = new Map(documentsSnap.docs.map((d) => [d.id, d.data().fileName]));
    const docTypeById = new Map(documentsSnap.docs.map((d) => [d.id, d.data().docType]));

    const docs = analysisSnap.docs.map((d) => {
      const a = d.data();
      return {
        fileName: fileNameById.get(a.documentId) || 'Unknown file',
        docType: docTypeById.get(a.documentId),
        brief: a.brief,
        chainOfTitle: a.chainOfTitle,
        missingDocs: a.missingDocs,
        flags: a.flags,
      };
    });

    const assessment = await synthesizeMatterAssessment(docs);

    await db.doc(`matters/${matterId}`).set(
      { overallAssessment: assessment, overallAssessmentAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    return assessment;
  }
);
