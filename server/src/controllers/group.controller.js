import { prisma } from '../lib/prisma.js';

/**
 * Aggregator logic - In a production environment, this would run 
 * as a BullMQ worker or Cron job.
 * It clusters PENDING orders by store and creation window.
 */
export const aggregateGroupOrders = async (req, res) => {
  try {
    // 1. Fetch all PENDING orders not already in a group
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        groupOrderId: null,
      },
    });

    // 2. Group by storeName
    const storeClusters = {};
    pendingOrders.forEach(order => {
      if (!order.storeName) return;
      if (!storeClusters[order.storeName]) storeClusters[order.storeName] = [];
      storeClusters[order.storeName].push(order);
    });

    const results = [];

    // 3. Process clusters with 2+ orders
    for (const [store, orders] of Object.entries(storeClusters)) {
      if (orders.length < 2) continue;

      // Create a Group Order
      const groupOrder = await prisma.$transaction(async (tx) => {
        const go = await tx.groupOrder.create({
          data: {
            storeName: store,
            storeAddress: orders[0].storeAddress,
            windowStart: new Date(),
            windowEnd: new Date(Date.now() + 60 * 60 * 1000), // 1 hour window
            status: 'FORMING',
            totalDeliveryFee: 0, 
          },
        });

        let newTotalFee = 0;

        // Link orders and apply fractional discount (30% off per order)
        for (const order of orders) {
          const discountedFee = Math.floor(order.deliveryFee * 0.7);
          newTotalFee += discountedFee;

          await tx.order.update({
            where: { id: order.id },
            data: {
              groupOrderId: go.id,
              deliveryFee: discountedFee,
            },
          });
        }

        // Update final fee on the group
        return await tx.groupOrder.update({
          where: { id: go.id },
          data: { totalDeliveryFee: newTotalFee },
        });
      });

      results.push(groupOrder);
    }

    res.json({
      message: `Aggregation complete. Created ${results.length} group orders.`,
      groups: results,
    });

  } catch (error) {
    console.error('Error aggregating group orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
