import express from 'express';
import { aggregateGroupOrders } from '../controllers/group.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// This endpoint triggers the aggregation logic (Manual trigger for MVP/Demo)
router.post('/aggregate', protect, aggregateGroupOrders);

export default router;
