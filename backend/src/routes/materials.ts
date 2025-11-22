import { Router } from 'express';
import { body } from 'express-validator';
import { 
  getAllMaterials, 
  getMaterialById, 
  createMaterial, 
  updateMaterial, 
  deleteMaterial,
  bulkCreateMaterials
} from '../controllers/materialsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all materials
router.get('/', getAllMaterials);

// Get material by ID
router.get('/:id', getMaterialById);

// Create material (Admin only)
router.post('/', requireRole(['ADMIN']), [
  body('name').notEmpty().trim(),
  body('unit').notEmpty().trim(),
  body('hsnSac').optional().trim()
], createMaterial);

// Bulk create materials (Admin only)
router.post('/bulk', requireRole(['ADMIN']), bulkCreateMaterials);

// Update material (Admin only)
router.put('/:id', requireRole(['ADMIN']), [
  body('name').optional().notEmpty().trim(),
  body('unit').optional().notEmpty().trim(),
  body('hsnSac').optional().trim()
], updateMaterial);

// Delete material (Admin only)
router.delete('/:id', requireRole(['ADMIN']), deleteMaterial);

export default router;
