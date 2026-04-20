import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import groupRoutes from './backend/routes/groups.js';
import expenseRoutes from './backend/routes/expenses.js';
import balanceRoutes from './backend/routes/balances.js';
import aiRoutes from './backend/routes/aiRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Ensure project ID is set for Admin SDK
if (!process.env.GOOGLE_CLOUD_PROJECT && process.env.VITE_FIREBASE_PROJECT_ID) {
  process.env.GOOGLE_CLOUD_PROJECT = process.env.VITE_FIREBASE_PROJECT_ID;
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
  });
  console.log('Firebase Admin Initialized for Project:', process.env.VITE_FIREBASE_PROJECT_ID);
}

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/balances', balanceRoutes);
app.use('/api/ai', aiRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`SmartSplit Firebase Backend running on port ${PORT}`);
});