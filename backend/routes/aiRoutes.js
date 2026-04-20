import express from 'express';
import { categorizeExpense, getSpendingInsights } from '../controllers/aiController.js';

const router = express.Router();

router.post('/categorize', categorizeExpense);
router.post('/insights', getSpendingInsights);

export default router;
