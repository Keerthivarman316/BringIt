import { prisma } from '../lib/prisma.js';

export const createOrder = async (req, res) => {
  try {
    const { 
      itemName, itemDescription, quantity, 
      storeName, storeAddress, storeLat, storeLng, 
      budget, deliveryFee, urgencyLevel, dropZoneId,
      paymentMethod, items
    } = req.body;

    if (!itemName || budget === undefined || deliveryFee === undefined) {
      return res.status(400).json({ message: 'Missing required order fields' });
    }

    const order = await prisma.order.create({
      data: {
        requesterId: req.user.id,
        itemName,
        itemDescription,
        quantity: quantity || 1,
        storeName,
        storeAddress,
        storeLat,
        storeLng,
        budget: Number(budget),
        deliveryFee: Number(deliveryFee),
        urgencyLevel: urgencyLevel || 'NORMAL',
        dropZoneId: dropZoneId || null,
        paymentMethod: paymentMethod || 'COD',
        collegeName: req.user.collegeName || 'IIIT Dharwad',
        items: items && items.length > 0 ? {
          create: items.map(item => ({
            name: item.name,
            quantity: Number(item.qty || item.quantity || 1),
            price: Number(item.price || 0),
            description: item.description || ''
          }))
        } : undefined
      },
      include: { items: true }
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { requesterId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        dropZone: true,
        match: {
          include: {
            trip: {
              include: {
                carrier: { select: { name: true, profilePicUrl: true, trustScore: true, deliveryCount: true, phone: true } }
              }
            }
          }
        }
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching Orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { budget, deliveryFee, urgencyLevel } = req.body;

    // Verify order belongs to the requester
    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (existingOrder.requesterId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Don't allow edits once matched
    if (existingOrder.status !== 'PENDING') {
      return res.status(400).json({ message: 'Cannot edit order after it has been matched' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...(budget !== undefined && { budget: Number(budget) }),
        ...(deliveryFee !== undefined && { deliveryFee: Number(deliveryFee) }),
        ...(urgencyLevel && { urgencyLevel })
      }
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating Order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPendingOrders = async (req, res) => {
  try {
    const carrier = req.user;
    
    // Construct the query based on payment preferences
    const whereConditions = {
      status: 'PENDING',
      collegeName: carrier.collegeName || 'IIIT Dharwad',
      OR: [
        // Condition 1: Prepaid orders (Must be already PAID)
        {
          paymentMethod: { not: 'COD' },
          paymentStatus: 'PAID'
        },
        // Condition 2: COD orders (Must match carrier's wallet capacity)
        {
          paymentStatus: 'PENDING',
          paymentMethod: 'COD',
          // Only show if carrier hasn't opted out of COD
          ...(carrier.prefersPrepaidOnly ? { id: 'disabled' } : {
            budget: { lte: carrier.maxCodLimit }
          })
        }
      ]
    };

    const orders = await prisma.order.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        dropZone: true,
        requester: { select: { name: true, trustScore: true } }
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { match: true }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.requesterId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    if (order.status !== 'PENDING' && order.status !== 'MATCHED') {
      return res.status(400).json({ message: 'Cannot cancel order once it has been picked up or delivered' });
    }

    // Process cancellation
    await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' }
      }),
      ...(order.match ? [prisma.match.update({
        where: { id: order.match.id },
        data: { status: 'CANCELLED' }
      })] : [])
    ]);

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling Order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { match: true }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Case 1: Requester deletes the entire order
    if (order.requesterId === req.user.id) {
      await prisma.order.delete({
        where: { id }
      });
      return res.json({ message: 'Order history cleared permanently' });
    }

    // Case 2: Carrier deletes their matching history
    if (order.match && order.match.carrierId === req.user.id) {
      await prisma.match.delete({
        where: { id: order.match.id }
      });
      return res.json({ message: 'Delivery record removed from history' });
    }

    return res.status(403).json({ message: 'Not authorized to delete this record' });
  } catch (error) {
    console.error('Error deleting Order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const completeOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { match: true }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.requesterId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to complete this order' });
    }

    const validStatuses = ['MATCHED', 'PICKED_UP', 'IN_TRANSIT'];
    if (!validStatuses.includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be completed in current status' });
    }

    // Process completion in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update Order Status
      await tx.order.update({
        where: { id },
        data: { status: 'DELIVERED' }
      });

      // 2. Wrap up Match and User Earnings
      if (order.match) {
        await tx.match.update({
          where: { id: order.match.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });

        await tx.user.update({
          where: { id: order.match.carrierId },
          data: { 
            deliveryCount: { increment: 1 },
            totalEarnings: { increment: order.deliveryFee }
          }
        });

        // 3. AUTO-COMPLETE TRIP
        // Check if there are other active matches for this trip, if not, or per user request:
        // By user requirement: "after delivering the order the trip should get canceled/completed"
        if (order.match.tripId) {
          await tx.trip.update({
            where: { id: order.match.tripId },
            data: { status: 'COMPLETED' }
          });
        }
      }
    });

    res.json({ message: 'Order marked as delivered and trip completed successfully' });
  } catch (error) {
    console.error('Error completing Order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
