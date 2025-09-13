import { Router } from 'express';
import { body } from 'express-validator';
import { login, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], login);

// Get current user profile
router.get('/profile', authenticateToken, getProfile);

export default router;
