import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createGroup, getGroups, getGroupDetails, updateGroup, deleteGroup } from '../controllers/groupController.js';

const router = express.Router();

router.use(protect);

router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:id', getGroupDetails);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

export default router;
