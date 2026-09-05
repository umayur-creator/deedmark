import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, import.meta.env.VITE_FUNCTIONS_REGION || 'asia-south1');

// `npm run dev` (Vite) sets import.meta.env.DEV to true automatically — this block
// never runs in a production build. It points every Firebase service at the local
// emulator ports from `firebase.json` instead of your real cloud project, so testing
// never touches production data or racks up real Document AI / Claude charges from
// stray clicks. Make sure `firebase emulators:start` is running in another terminal
// before you load the app, or these connections will just fail.
if (import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8081);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);

  // Temporary stand-in for real login: the analyzeDocument function requires a
  // signed-in user, and there's no login screen yet (see README). This signs in
  // anonymously against the emulator so you can test the upload -> OCR -> Claude
  // flow end to end. Remove this once real auth + matter creation are wired up —
  // an anonymous user has no role and isn't attached to any real matter.
  signInAnonymously(auth).catch((err) => console.error('Anonymous sign-in failed', err));
}
