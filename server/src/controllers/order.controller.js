import { prisma } from '../lib/prisma.js';

export const createOrder = async (req, res) => {
  try {
    const { 
      itemName, itemDescription, quantity, 
      storeName, storeAddress, storeLat, storeLng, 
      budget, deliveryFee, urgencyLevel, dropZoneId,
      paymentMethod
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
        paymentMethod: paymentMethod || 'COD'
      }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating Order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { requesterId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        dropZone: true,
        match: {
          include: {
            trip: {
              include: {
                carrier: { select: { name: true, profilePicUrl: true, trustScore: true } }
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
    const orders = await prisma.order.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
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
