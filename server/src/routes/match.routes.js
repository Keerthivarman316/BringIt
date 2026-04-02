import express from 'express';
import { createMatch } from '../controllers/match.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', authenticateToken, createMatch);

export default router;
