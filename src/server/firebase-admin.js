// server/firebase-admin.js
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Service account key (for server-side operations)
const serviceAccount = JSON.parse(
  readFileSync(process.env.FIREBASE_ADMIN_SDK_PATH, 'utf8')
);

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;