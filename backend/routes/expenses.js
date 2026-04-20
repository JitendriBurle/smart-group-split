import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { addExpense, getGroupExpenses, updateExpense, deleteExpense } from '../controllers/expenseController.js';

const router = express.Router();

router.use(protect);

router.post('/', addExpense);
router.get('/:groupId', getGroupExpenses);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
