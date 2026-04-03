import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bringit_super_secret_key_change_me';

export const register = async (req, res) => {
  try {
    const { name, email, password, role, collegeName, phone } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role ? role.toUpperCase() : 'REQUESTER',
        phone: phone || null,
        collegeName: collegeName || 'IIIT Dharwad'
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, email: newUser.email, collegeName: newUser.collegeName, phone: newUser.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Don't send password hash back
    const { passwordHash: _, ...userData } = newUser;

    res.status(201).json({ user: userData, token });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, collegeName: user.collegeName, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...userData } = user;
    res.json({ user: userData, token });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { passwordHash: _, ...userData } = user;
    res.json({ user: userData });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { isOnline, reason } = req.body;
    
    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update user online status
      const user = await tx.user.update({
        where: { id: req.user.id },
        data: { isOnline: !!isOnline }
      });

      // 2. If turning offline, handle active missions
      if (!isOnline) {
        const cancellationMsg = reason || 'Carrier went offline';
        
        // Find all active trips for this carrier
        const activeTrips = await tx.trip.findMany({
          where: { 
            carrierId: req.user.id,
            status: { in: ['OPEN', 'IN_PROGRESS'] }
          },
          include: { matches: true }
        });

        for (const trip of activeTrips) {
          // Cancel the trip
          await tx.trip.update({
            where: { id: trip.id },
            data: { 
              status: 'CANCELLED',
              cancellationReason: cancellationMsg
            }
          });

          // Handle each match on this trip
          for (const match of trip.matches) {
            // Cancel the match
            await tx.match.update({
              where: { id: match.id },
              data: { status: 'CANCELLED' }
            });

            // Return the order to PENDING pool
            await tx.order.update({
              where: { id: match.orderId },
              data: { 
                status: 'PENDING',
                cancellationReason: `Re-listed: ${cancellationMsg}`
              }
            });
          }
        }
      }

      return user;
    });

    res.json({ message: 'Status updated and missions handled', isOnline: result.isOnline });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
