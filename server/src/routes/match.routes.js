import express from 'express';
import { createMatch, getMyMatches } from '../controllers/match.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, createMatch);
router.get('/my-matches', protect, getMyMatches);

export default router;
