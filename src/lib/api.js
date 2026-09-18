import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes } from 'firebase/storage';
import { functions, storage } from '../firebase';

/**
 * Uploads a document to Storage, then calls the analyzeDocument Cloud Function,
 * which runs it through Document AI (OCR) and Claude (title analysis) server-side.
 *
 * @param {File} file - the PDF/image selected by the user
 * @param {string} matterId - the matter this document belongs to
 * @returns {Promise<{ docType: string, ocrPreview: string, brief: string,
 *                      chainOfTitle: Array, missingDocs: Array, flags: Array }>}
 */
export async function analyzeDocument(file, matterId) {
  const storagePath = `matters/${matterId}/raw/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });

  const call = httpsCallable(functions, 'analyzeDocument', { timeout: 600000 }); // 10 min
  const result = await call({ matterId, storagePath, fileName: file.name });
  return result.data;
}

export async function generateMatterAssessment(matterId) {
  const call = httpsCallable(functions, 'generateMatterAssessment', { timeout: 600000 });
  const result = await call({ matterId });
  return result.data;
}

export async function createOrganization(orgName) {
  const call = httpsCallable(functions, 'createOrganization');
  const result = await call({ orgName });
  return result.data;
}

export async function createMatterWithClient(data) {
  const call = httpsCallable(functions, 'createMatterWithClient');
  const result = await call(data);
  return result.data;
}

export async function claimMatter(matterId) {
  const call = httpsCallable(functions, 'claimMatter');
  const result = await call({ matterId });
  return result.data;
}

export async function listClients(orgId) {
  const { collection, query, getDocs } = await import('firebase/firestore');
  const { db } = await import('../firebase');
  const snap = await getDocs(collection(db, `organizations/${orgId}/clients`));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}