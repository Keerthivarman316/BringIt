import express from 'express';
import { getDropZones, generateDropZoneQR, verifyDropZoneQR } from '../controllers/dropzone.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', protect, getDropZones);
router.post('/generate-qr', protect, generateDropZoneQR);
router.post('/verify-qr', protect, verifyDropZoneQR);

export default router;
