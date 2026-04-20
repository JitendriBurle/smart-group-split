import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Ensure project ID is set for Admin SDK IMMEDIATELY
if (!process.env.GOOGLE_CLOUD_PROJECT && process.env.VITE_FIREBASE_PROJECT_ID) {
  process.env.GOOGLE_CLOUD_PROJECT = process.env.VITE_FIREBASE_PROJECT_ID;
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
  });
  console.log('Firebase Admin Initialized for Project:', process.env.VITE_FIREBASE_PROJECT_ID);
}

// Routes must be imported AFTER Admin is initialized
import groupRoutes from './backend/routes/groups.js';
import expenseRoutes from './backend/routes/expenses.js';
import balanceRoutes from './backend/routes/balances.js';
import aiRoutes from './backend/routes/aiRoutes.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('--- Backend Internal Error ---');
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`SmartSplit Firebase Backend running on port ${PORT}`);
});