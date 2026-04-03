import express from 'express';
import { createOrder, getMyOrders, updateOrder, getPendingOrders, cancelOrder } from '../controllers/order.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/pending', protect, getPendingOrders);
router.get('/my-orders', protect, getMyOrders);
router.patch('/:id', protect, updateOrder);
router.delete('/:id', protect, cancelOrder);

export default router;
