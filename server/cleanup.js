import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('♻️  Starting FULL DATABASE RESET...');
  
  try {
    // Stage 1: Social & Activity
    console.log('Cleaning social records...');
    await prisma.review.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.carbonLog.deleteMany({});

    // Stage 2: Matching & Routing
    console.log('Cleaning match and route records...');
    await prisma.match.deleteMany({});
    await prisma.routeStop.deleteMany({});

    // Stage 3: Core Logistics
    console.log('Cleaning trips and orders...');
    await prisma.trip.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.groupOrder.deleteMany({});
    await prisma.dropZone.deleteMany({});

    // Stage 4: Users (Final Step)
    console.log('Removing all user accounts...');
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✅ Success! Deleted ${deletedUsers.count} users and all associated platform data.`);
    
    console.log('\n✨ Database is now completely empty.');
  } catch (err) {
    console.error('❌ Reset failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
