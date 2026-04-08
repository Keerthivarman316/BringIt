import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, orderId } = req.body; // amount in INR

    const options = {
      amount: amount * 100, // razorpay expects amount in paise
      currency: 'INR',
      receipt: `order_rcpt_${orderId}`,
    };

    const rzpOrder = await razorpay.orders.create(options);

    // Update BringIt order with Razorpay Order ID
    await prisma.order.update({
      where: { id: orderId },
      data: { razorpayOrderId: rzpOrder.id }
    });

    res.json(rzpOrder);
  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    res.status(500).json({ message: 'Could not initialize payment', error: error.message });
  }
};

export const verifySignature = async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: 'PENDING' // Already pending, but ensuring it's confirmed
        }
      });
      res.json({ message: 'Payment verified successfully', success: true });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' }
      });
      res.status(400).json({ message: 'Invalid signature', success: false });
    }
  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
};
