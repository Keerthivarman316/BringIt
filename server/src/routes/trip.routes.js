import express from 'express';
import { createTrip, getMyTrips } from '../controllers/trip.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, createTrip);
router.get('/my-trips', protect, getMyTrips);

export default router;
