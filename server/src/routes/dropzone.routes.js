import express from 'express';
import { getDropZones, createDropZone } from '../controllers/dropzone.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', protect, getDropZones);
router.post('/', protect, createDropZone);

export default router;
