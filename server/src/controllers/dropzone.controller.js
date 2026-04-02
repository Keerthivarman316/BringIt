import { prisma } from '../lib/prisma.js';

export const getDropZones = async (req, res) => {
  try {
    const dropZones = await prisma.dropZone.findMany({
      where: { isActive: true },
    });
    res.json(dropZones);
  } catch (error) {
    console.error('Error fetching DropZones:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

import { generateDropZonePayload, verifyDropZonePayload } from '../services/crypto.service.js';

export const generateDropZoneQR = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { match: true }
    });

    if (!order || !order.match || order.match.carrierId !== req.user.id) {
       return res.status(403).json({ message: 'Unauthorized. You are not the carrier.' });
    }

    const payload = generateDropZonePayload(orderId);
    
    // Store signature in DB for auditing
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        dropZoneQrCode: payload,
        dropZoneQrExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      }
    });

    res.json({ qrPayload: payload, order: updatedOrder });
  } catch (error) {
    console.error('Error generating dropzone QR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyDropZoneQR = async (req, res) => {
  try {
    const { qrPayload } = req.body;
    
    if (!verifyDropZonePayload(qrPayload)) {
      return res.status(400).json({ message: 'Invalid or forged QR code signature' });
    }

    const { orderId } = JSON.parse(qrPayload);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { match: true }
    });

    if (!order || order.requesterId !== req.user.id) {
      return res.status(403).json({ message: 'This QR code is for a different user.' });
    }

    // Success! This matches the logic from completeDelivery but validated by QR
    res.json({ message: 'QR verification successful. You can now proceed to complete delivery.', orderId });
  } catch (error) {
    console.error('Error verifying dropzone QR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

