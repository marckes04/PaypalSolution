import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminDb: Firestore | null = null;

try {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (!getApps().length) {
    // Si tienes cuenta de servicio configurada la usa, si no, usa el project ID directo
    initializeApp({
      projectId: projectId,
    });
  }
  adminDb = getFirestore();
} catch (error) {
  console.warn('[Firebase Admin Init] Error al iniciar SDK Admin:', error);
}

export { adminDb };