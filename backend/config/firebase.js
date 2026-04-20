import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Initialize Firebase Admin
 * Expects GOOGLE_APPLICATION_CREDENTIALS environment variable 
 * to point to a service account JSON file.
 * Fallback: admin.initializeApp() will try to find credentials automatically.
 */
// Firebase Admin is initialized centrally in server.js
// to ensure consistency and correct project ID handling.
const db = admin.firestore();
const auth = admin.auth();

export { db, auth };
