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

    // Create Match & Update Order status in a transaction
    const [match, updatedOrder] = await prisma.$transaction([
      prisma.match.create({
        data: {
          tripId,
          orderId,
          carrierId: req.user.id,
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'MATCHED' }
      })
    ]);

    res.status(201).json(match);

  } catch (error) {
    console.error('Error creating Match:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
