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
  const call = httpsCallable(functions, 'generateMatterAssessment');
  const result = await call({ matterId });
  return result.data;
}