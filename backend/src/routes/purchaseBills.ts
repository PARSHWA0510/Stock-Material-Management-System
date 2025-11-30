import { Router } from 'express';
import { body } from 'express-validator';
import { 
  getAllPurchaseBills, 
  getPurchaseBillById, 
  createPurchaseBill,
  deletePurchaseBill
} from '../controllers/purchaseBillsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all purchase bills
router.get('/', getAllPurchaseBills);

// Get purchase bill by ID
router.get('/:id', getPurchaseBillById);

// Create purchase bill
router.post('/', [
  body('companyId').notEmpty().isUUID(),
  body('invoiceNumber').notEmpty().trim(),
  body('gstinNumber').optional().trim(),
  body('billDate').isISO8601().toDate(),
  body('deliveredToType').isIn(['GODOWN', 'SITE']),
  body('deliveredToId').notEmpty().isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.materialId').notEmpty().isUUID(),
  body('items.*.quantity').isNumeric().isFloat({ min: 0.01 }),
  body('items.*.unit').notEmpty().trim(),
  body('items.*.rate').isNumeric().isFloat({ min: 0 }),
  body('items.*.gstPercent').isNumeric().isFloat({ min: 0, max: 100 }),
  body('items.*.totalExclGst').isNumeric().isFloat({ min: 0 }),
  body('items.*.totalInclGst').isNumeric().isFloat({ min: 0 }),
  body('items.*.locationInGodown').optional().trim()
], createPurchaseBill);

// Delete purchase bill (Admin only)
router.delete('/:id', requireRole(['ADMIN']), deletePurchaseBill);

export default router;
