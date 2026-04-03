import express from 'express';
import { createTrip, getMyTrips, getAvailableTrips, cancelTrip, deleteTrip } from '../controllers/trip.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, createTrip);
router.get('/my-trips', protect, getMyTrips);
router.get('/available', protect, getAvailableTrips);
router.patch('/:id/cancel', protect, cancelTrip);
router.delete('/:id', protect, deleteTrip);

export default router;
