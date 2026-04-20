import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getGroupBalances } from '../controllers/balanceController.js';

const router = express.Router();

router.get('/:groupId', protect, getGroupBalances);

export default router;
