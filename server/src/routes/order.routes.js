import express from 'express';
import { createOrder, getMyOrders, updateOrder } from '../controllers/order.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.patch('/:id', protect, updateOrder);

export default router;
