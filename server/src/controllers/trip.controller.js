import { prisma } from '../lib/prisma.js';

export const createTrip = async (req, res) => {
  try {
    const { destination, destinationLat, destinationLng, departureTime, returnTime, capacity } = req.body;
    
    console.log('[DEBUG] createTrip request from:', { id: req.user.id, role: req.user.role });

    // Only CARRIER or ADMIN can create trips
    if (req.user.role !== 'CARRIER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only carriers can post trips' });
    }

    // Prevent duplicate active trips
    const existingActiveTrip = await prisma.trip.findFirst({
      where: {
        carrierId: req.user.id,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    });

    if (existingActiveTrip) {
      return res.status(400).json({ 
        message: 'You already have an active trip to ' + existingActiveTrip.destination + '. Please complete or cancel it before planning a new one.' 
      });
    }

    console.log('[STEP 1] Validating inputs:', { destination, departureTime, capacity });
    if (!destination || !departureTime || !capacity) {
      return res.status(400).json({ message: 'Missing required trip fields' });
    }

    console.log('[STEP 2] Parsing dates...');
    const depDate = new Date(departureTime);
    if (isNaN(depDate.getTime())) {
      return res.status(400).json({ message: 'Invalid departure time' });
    }

    let retDate = null;
    if (returnTime && returnTime.trim() !== '') {
      retDate = new Date(returnTime);
      if (isNaN(retDate.getTime())) {
        return res.status(400).json({ message: 'Invalid return time' });
      }
    }

    console.log('[STEP 3] Preparing trip data for Prisma...');
    const tripData = {
      carrierId: req.user.id,
      destination,
      destinationLat: (destinationLat !== undefined && destinationLat !== null && destinationLat !== '') ? Number(destinationLat) : null,
      destinationLng: (destinationLng !== undefined && destinationLng !== null && destinationLng !== '') ? Number(destinationLng) : null,
      departureTime: depDate,
      returnTime: retDate,
      capacity: !isNaN(Number(capacity)) ? Number(capacity) : 4
    };
    console.log('[STEP 4] Calling prisma.trip.create with:', tripData);

    const trip = await prisma.trip.create({
      data: tripData
    });

    console.log('[STEP 5] Trip created successfully:', trip.id);
    res.status(201).json(trip);
  } catch (error) {
    console.error('CRITICAL: Error creating Trip:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      userId: req.user?.id
    });
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getMyTrips = async (req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { carrierId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        matches: { 
          include: { 
            order: { 
              include: { requester: { select: { id: true, name: true, email: true } } } 
            } 
          } 
        },
        routeStops: true
      }
    });
    res.json(trips);
  } catch (error) {
    console.error('Error fetching Trips:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAvailableTrips = async (req, res) => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const trips = await prisma.trip.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        departureTime: { gte: twoHoursAgo }
      },
      include: {
        carrier: { select: { id: true, name: true, trustScore: true, profilePicUrl: true, email: true, collegeName: true, isOnline: true } }
      }
    });
    res.json(trips);
  } catch (error) {
    console.error('Error fetching available trips:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelTrip = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { matches: true }
    });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.carrierId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this trip' });
    }

    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Trip already completed or cancelled' });
    }

    // Process cancellation in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Cancel the trip
      await tx.trip.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      if (trip.matches.length > 0) {
        const orderIds = trip.matches.map(m => m.orderId);
        const matchIds = trip.matches.map(m => m.id);

        // 2. Mark orders as CANCELLED (user requested this over PENDING revert)
        await tx.order.updateMany({
          where: { id: { in: orderIds } },
          data: { status: 'CANCELLED' }
        });

        // 3. Cancel all matches
        await tx.match.updateMany({
          where: { id: { in: matchIds } },
          data: { status: 'CANCELLED' }
        });
      }
    });

    res.json({ message: 'Trip cancelled successfully. All matched orders reverted.' });
  } catch (error) {
    console.error('Error cancelling trip:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id }
    });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.carrierId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this trip' });
    }

    if (trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED') {
      return res.status(400).json({ message: 'Can only delete completed or cancelled trips' });
    }

    // Process hard deletion in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete associated route stops
      await tx.routeStop.deleteMany({ where: { tripId: id } });

      // 2. Delete associated matches
      await tx.match.deleteMany({ where: { tripId: id } });

      // 3. Delete the trip
      await tx.trip.delete({ where: { id } });
    });

    res.json({ message: 'Trip history deleted successfully.' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        carrier: { select: { id: true, name: true, trustScore: true, profilePicUrl: true, deliveryCount: true } }
      }
    });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.json(trip);
  } catch (error) {
    console.error('Error fetching trip by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
