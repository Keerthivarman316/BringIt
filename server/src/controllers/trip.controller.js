import { prisma } from '../lib/prisma.js';

export const createTrip = async (req, res) => {
  try {
    const { destination, destinationLat, destinationLng, departureTime, returnTime, capacity } = req.body;
    
    // Only CARRIER or ADMIN can create trips
    if (req.user.role !== 'CARRIER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only carriers can post trips' });
    }

    if (!destination || !departureTime || !capacity) {
      return res.status(400).json({ message: 'Missing required trip fields' });
    }

    const trip = await prisma.trip.create({
      data: {
        carrierId: req.user.id,
        destination,
        destinationLat,
        destinationLng,
        departureTime: new Date(departureTime),
        returnTime: returnTime ? new Date(returnTime) : null,
        capacity: Number(capacity)
      }
    });

    res.status(201).json(trip);
  } catch (error) {
    console.error('Error creating Trip:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyTrips = async (req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { carrierId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        matches: { include: { order: true } },
        routeStops: true
      }
    });
    res.json(trips);
  } catch (error) {
    console.error('Error fetching Trips:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
