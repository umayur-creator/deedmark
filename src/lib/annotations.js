import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

/** Subscribes to all highlights on a document, live -- fires immediately with
 * current data and again whenever anyone adds a highlight. */
export function subscribeHighlights(matterId, documentId, callback) {
  const q = query(
    collection(db, `matters/${matterId}/documents/${documentId}/highlights`),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function deleteHighlight(matterId, documentId, highlightId) {
  await deleteDoc(doc(db, `matters/${matterId}/documents/${documentId}/highlights/${highlightId}`));
}
export async function addHighlight(matterId, documentId, highlight) {
  await addDoc(collection(db, `matters/${matterId}/documents/${documentId}/highlights`), {
    ...highlight,
    authorId: auth.currentUser?.uid || 'unknown',
    createdAt: serverTimestamp(),
  });
}

/** Subscribes to the comment thread on one specific highlight, live. */
export function subscribeComments(matterId, documentId, highlightId, callback) {
  const q = query(
    collection(db, `matters/${matterId}/documents/${documentId}/highlights/${highlightId}/comments`),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addComment(matterId, documentId, highlightId, text) {
  await addDoc(
    collection(db, `matters/${matterId}/documents/${documentId}/highlights/${highlightId}/comments`),
    {
      text,
      authorId: auth.currentUser?.uid || 'unknown',
      createdAt: serverTimestamp(),
    }
  );
}