import { Router } from 'express';
import { body } from 'express-validator';
import { 
  getAllMaterialIssues, 
  getMaterialIssueById, 
  createMaterialIssue,
  deleteMaterialIssue
} from '../controllers/materialIssuesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all material issues
router.get('/', getAllMaterialIssues);

// Get material issue by ID
router.get('/:id', getMaterialIssueById);

// Create material issue
router.post('/', [
  body('siteId').notEmpty().isUUID(),
  body('fromGodownId').optional().isUUID(),
  body('issueDate').isISO8601().toDate(),
  body('items').isArray({ min: 1 }),
  body('items.*.materialId').notEmpty().isUUID(),
  body('items.*.quantity').isNumeric().isFloat({ min: 0.01 }),
  body('items.*.unit').notEmpty().trim(),
  body('items.*.rate').isNumeric().isFloat({ min: 0 }),
  body('items.*.gstPercent').isNumeric().isFloat({ min: 0, max: 100 }),
  body('items.*.totalExclGst').isNumeric().isFloat({ min: 0 }),
  body('items.*.totalInclGst').isNumeric().isFloat({ min: 0 })
], createMaterialIssue);

// Delete material issue (Admin only)
router.delete('/:id', deleteMaterialIssue);

export default router;
