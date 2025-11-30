import { Router } from 'express';
import { body } from 'express-validator';
import { getAllGodowns, createGodown, updateGodown, deleteGodown } from '../controllers/godownsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all godowns
router.get('/', getAllGodowns);

// Create godown (Admin and Storekeeper)
router.post('/', requireRole(['ADMIN', 'STOREKEEPER']), [
  body('name').notEmpty().trim(),
  body('address').optional().trim()
], createGodown);

// Update godown (Admin and Storekeeper)
router.put('/:id', requireRole(['ADMIN', 'STOREKEEPER']), [
  body('name').optional().trim(),
  body('address').optional().trim()
], updateGodown);

// Delete godown (Admin only)
router.delete('/:id', requireRole(['ADMIN']), deleteGodown);

export default router;
