import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Initialize Firebase Admin
 * Expects GOOGLE_APPLICATION_CREDENTIALS environment variable 
 * to point to a service account JSON file.
 * Fallback: admin.initializeApp() will try to find credentials automatically.
 */
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log('Firebase Admin Initialized');
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error.message);
  }
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };
