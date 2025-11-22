import { Router } from 'express';
import { body } from 'express-validator';
import { getAllCompanies, createCompany, updateCompany, deleteCompany, bulkCreateCompanies } from '../controllers/companiesController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all companies
router.get('/', getAllCompanies);

// Create company (Admin only)
router.post('/', requireRole(['ADMIN']), [
  body('name').notEmpty().trim(),
  body('gstin').optional().trim(),
  body('address').optional().trim(),
  body('contactPerson').optional().trim(),
  body('mobileNumber').optional().trim(),
  body('emailId').optional().trim()
], createCompany);

// Bulk create companies (Admin only)
router.post('/bulk', requireRole(['ADMIN']), bulkCreateCompanies);

// Update company (Admin only)
router.put('/:id', requireRole(['ADMIN']), [
  body('name').optional().trim(),
  body('gstin').optional().trim(),
  body('address').optional().trim(),
  body('contactPerson').optional().trim(),
  body('mobileNumber').optional().trim(),
  body('emailId').optional().trim()
], updateCompany);

// Delete company (Admin only)
router.delete('/:id', requireRole(['ADMIN']), deleteCompany);

export default router;
