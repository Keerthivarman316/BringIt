import express from 'express';
import { pickupOrder, completeDelivery } from '../controllers/delivery.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/pickup', protect, pickupOrder);
router.post('/complete', protect, completeDelivery);

export default router;
