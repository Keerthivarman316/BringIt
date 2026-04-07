import express from 'express';
import { register, login, getMe, updateStatus, switchRole } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.patch('/status', protect, updateStatus);
router.put('/switch-role', protect, switchRole);

export default router;
