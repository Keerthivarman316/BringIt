import { prisma } from '../lib/prisma.js';

export const createMatch = async (req, res) => {
  try {
    const { tripId, orderId } = req.body;
    
    // Only CARRIER or ADMIN can accept orders
    if (req.user.role !== 'CARRIER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only carriers can accept orders' });
    }

    if (!tripId || !orderId) {
       return res.status(400).json({ message: 'Missing tripId or orderId' });
    }

    // Verify trip belongs to carrier
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.carrierId !== req.user.id) {
       return res.status(403).json({ message: 'Trip not found or unauthorized' });
    }

    // Verify order is PENDING
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'PENDING') {
       return res.status(400).json({ message: 'Order is not available for matching or does not exist.' });
    }

    // Create Match, Update Order, and Freeze Credits in a transaction
    const match = await prisma.$transaction(async (tx) => {
      // 1. Create the Match
      const m = await tx.match.create({
        data: {
          tripId,
          orderId,
          carrierId: req.user.id,
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      });

      // 2. Update Order Status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'MATCHED' }
      });

      // 3. Freeze Credits from Requester
      const requester = await tx.user.findUnique({ where: { id: order.requesterId } });
      const deliveryFee = order.deliveryFee;

      if (requester.creditBalance < deliveryFee) {
        throw new Error('Requester has insufficient credits to cover the delivery fee');
      }

      await tx.creditTransaction.create({
        data: {
          userId: requester.id,
          type: 'FREEZE',
          amount: -deliveryFee,
          balanceAfter: requester.creditBalance - deliveryFee,
          referenceId: orderId,
          note: `Funds frozen for delivery match ${m.id}`,
        }
      });

      await tx.user.update({
        where: { id: requester.id },
        data: { creditBalance: { decrement: deliveryFee } }
      });

      return m;
    });

    res.status(201).json(match);

  } catch (error) {
    console.error('Error creating Match:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
