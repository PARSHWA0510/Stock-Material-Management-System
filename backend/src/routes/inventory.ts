import { Router } from 'express';
import { 
  getInventory, 
  getStockTransactions 
} from '../controllers/inventoryController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get inventory levels
router.get('/', getInventory);

// Get stock transactions
router.get('/transactions', getStockTransactions);

export default router;
