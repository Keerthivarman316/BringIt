import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting cleanup...');
  
  try {
    // Delete matches first due to foreign keys
    const deletedMatches = await prisma.match.deleteMany({});
    console.log(`- Deleted ${deletedMatches.count} matches`);

    // Delete route stops
    const deletedStops = await prisma.routeStop.deleteMany({});
    console.log(`- Deleted ${deletedStops.count} route stops`);

    // Delete trips
    const deletedTrips = await prisma.trip.deleteMany({});
    console.log(`- Deleted ${deletedTrips.count} trips`);

    // Delete orders
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`- Deleted ${deletedOrders.count} orders`);

    console.log('✅ Cleanup complete! Database is fresh.');
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
