import express from 'express';
import { createRazorpayOrder, verifySignature } from '../controllers/payment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/create-order', protect, createRazorpayOrder);
router.post('/verify', protect, verifySignature);

export default router;
