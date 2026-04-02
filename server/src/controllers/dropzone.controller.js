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

export const createDropZone = async (req, res) => {
  try {
    // Only admins should ideally do this, but keeping open for development
    const { name, description, lat, lng } = req.body;
    
    if (!name || !lat || !lng) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newZone = await prisma.dropZone.create({
      data: { name, description, lat, lng }
    });

    res.status(201).json(newZone);
  } catch (error) {
    console.error('Error creating DropZone:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
