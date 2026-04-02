import { prisma } from '../lib/prisma.js';

export const createReview = async (req, res) => {
  try {
    const { matchId, rating, comment } = req.body;
    
    // Validations
    if (!matchId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Requires matchId and a valid 1-5 rating' });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { order: true, carrier: true }
    });

    if (!match || match.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Match must be COMPLETED before reviewing' });
    }

    if (match.order.requesterId !== req.user.id) {
      return res.status(403).json({ message: 'Only standard Requesters can rate the Carrier' });
    }

    // Ensure they haven't submitted a review already
    const existingReview = await prisma.review.findUnique({ where: { matchId } });
    if (existingReview) {
      return res.status(400).json({ message: 'Review already submitted for this order' });
    }

    // Fetch the reviewer to get their current trust score weighting
    const reviewer = await prisma.user.findUnique({ where: { id: req.user.id } });

    // Transaction for creating review + updating Carrier global trust score safely
    const [review, updatedCarrier] = await prisma.$transaction(async (tx) => {
      const rev = await tx.review.create({
        data: {
          matchId: match.id,
          reviewerId: req.user.id,
          reviewedUserId: match.carrierId,
          rating: Number(rating),
          comment,
          reviewerTrustScoreAtTime: reviewer.trustScore || 1.0
        }
      });

      // Advanced Trust Graph recalculation (Weighted by rater's own trust)
      const allReviews = await tx.review.findMany({ 
        where: { reviewedUserId: match.carrierId } 
      });
      
      const weightedSum = allReviews.reduce((sum, r) => sum + (r.rating * r.reviewerTrustScoreAtTime), 0);
      const totalWeight = allReviews.reduce((sum, r) => sum + r.reviewerTrustScoreAtTime, 0);
      const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 1.0;
      
      // Fetch current carrier to check delivery count for badge logic
      const currentCarrier = await tx.user.findUnique({ where: { id: match.carrierId } });
      
      let newTier = currentCarrier.verificationTier;
      if (currentCarrier.deliveryCount >= 20 && newTier !== 'TRUSTED_CARRIER') {
        newTier = 'TRUSTED_CARRIER';
      }

      // Update Carrier graph and tier
      const updatedUser = await tx.user.update({
        where: { id: match.carrierId },
        data: { 
          trustScore: weightedAvg,
          verificationTier: newTier
        }
      });

      return [rev, updatedUser];
    });

    res.status(201).json({ review, trustScore: updatedCarrier.trustScore });

  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
