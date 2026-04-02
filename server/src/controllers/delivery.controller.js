import { prisma } from '../lib/prisma.js';

// Carrier marks order as picked up
export const pickupOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'Order ID is required' });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { match: true }
    });

    if (!order || !order.match) {
      return res.status(404).json({ message: 'Valid matched order not found' });
    }

    if (order.match.carrierId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized. You are not the assigned carrier.' });
    }

    if (order.status !== 'MATCHED') {
      return res.status(400).json({ message: 'Order is not in MATCHED state' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PICKED_UP' }
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error in pickupOrder:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Requester marks order as delivered, triggering Escrow payout
export const completeDelivery = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'Order ID is required' });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { match: true, requester: true }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // In our simplified MVP, the Requester confirms delivery.
    if (order.requesterId !== req.user.id) {
      return res.status(403).json({ message: 'Only the Requester can confirm receipt' });
    }

    if (order.status !== 'PICKED_UP' && order.status !== 'MATCHED') {
      return res.status(400).json({ message: 'Order must be MATCHED or PICKED_UP to be delivered' });
    }

    // Atomic Prisma Transaction to secure status updates and Carbon tracking
    await prisma.$transaction(async (tx) => {
      // 1. Update Order Status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' }
      });

      // 2. Update Match Status
      await tx.match.update({
        where: { id: order.match.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });

      // 3. Update Carrier Stats
      await tx.user.update({
        where: { id: carrierId },
        data: {
          deliveryCount: { increment: 1 }
        }
      });

      // 4. Log Carbon Footprint Savings (Phase 5 Insights)
      // Every peer delivery replaces a solo trip (approx 3km saved)
      const kmSaved = 3.0;
      const co2SavedGrams = kmSaved * 120.0; // ~120g CO2 per km for a car

      await tx.carbonLog.create({
        data: {
          matchId: order.match.id,
          userId: carrierId,
          kmSaved,
          co2SavedGrams
        }
      });
    });

    res.json({ message: 'Delivery completed and escrow rewarded successfully' });
  } catch (error) {
    console.error('Error in completeDelivery:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
