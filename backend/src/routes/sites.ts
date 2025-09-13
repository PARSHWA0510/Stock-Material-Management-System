import { Router } from 'express';
import { body } from 'express-validator';
import { getAllSites, createSite, updateSite, deleteSite } from '../controllers/sitesController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all sites
router.get('/', getAllSites);

// Create site (Admin only)
router.post('/', requireRole(['ADMIN']), [
  body('name').notEmpty().trim(),
  body('address').optional().trim()
], createSite);

// Update site (Admin only)
router.put('/:id', requireRole(['ADMIN']), [
  body('name').optional().trim(),
  body('address').optional().trim()
], updateSite);

// Delete site (Admin only)
router.delete('/:id', requireRole(['ADMIN']), deleteSite);

export default router;
