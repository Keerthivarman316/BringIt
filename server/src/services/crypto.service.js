import crypto from 'crypto';

const CRYPTO_SECRET = process.env.CRYPTO_SECRET || 'bringit_dropzone_hmac_secret_key';

/**
 * Generate a signed QR payload for secure Drop Zone handoffs.
 * Uses HMAC-SHA256 to ensure authenticity.
 */
export const generateDropZonePayload = (orderId) => {
  const hmac = crypto.createHmac('sha256', CRYPTO_SECRET);
  hmac.update(orderId);
  const signature = hmac.digest('hex');
  
  // Payload contains orderId and its signature
  return JSON.stringify({ orderId, signature });
};

/**
 * Verify a QR payload from a Requester's scan.
 */
export const verifyDropZonePayload = (payload) => {
  try {
    const { orderId, signature } = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    const hmac = crypto.createHmac('sha256', CRYPTO_SECRET);
    hmac.update(orderId);
    const expectedSignature = hmac.digest('hex');
    
    return signature === expectedSignature;
  } catch (err) {
    return false;
  }
};
