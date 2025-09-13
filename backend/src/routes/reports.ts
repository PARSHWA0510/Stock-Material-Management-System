import express from 'express';
import { getSiteMaterialReports, getSiteMaterialHistory } from '../controllers/reportsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get site-wise material reports
router.get('/site-materials', authenticateToken, getSiteMaterialReports);

// Get detailed material history for a specific site and material
router.get('/site-materials/:site_id/:material_id/history', authenticateToken, getSiteMaterialHistory);

export default router;