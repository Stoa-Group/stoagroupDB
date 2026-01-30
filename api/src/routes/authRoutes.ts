import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.post('/login', authController.login);
router.post('/domo', authController.domoSso);

// Protected routes (require authentication)
router.get('/verify', authenticate, authController.verify);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
