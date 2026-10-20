import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error(
      '[PayAgent Firebase Error]: NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing. Check your .env.local file and restart next dev.'
    );
  }

  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  firestoreInstance = getFirestore(app);
  return firestoreInstance;
}