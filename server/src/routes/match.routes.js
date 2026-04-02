import express from 'express';
import { createMatch } from '../controllers/match.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, createMatch);

export default router;
