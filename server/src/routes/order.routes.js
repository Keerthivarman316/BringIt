import express from 'express';
import { createOrder, getMyOrders, updateOrder, getPendingOrders, cancelOrder, deleteOrder, completeOrder } from '../controllers/order.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/pending', protect, getPendingOrders);
router.get('/my-orders', protect, getMyOrders);
router.patch('/:id', protect, updateOrder);
router.patch('/:id/cancel', protect, cancelOrder);
router.patch('/:id/complete', protect, completeOrder);
router.delete('/:id', protect, deleteOrder);

export default router;
