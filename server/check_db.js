import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany();
    const trips = await prisma.trip.findMany();
    const orders = await prisma.order.findMany();
    console.log('--- USERS ---');
    console.log(users.map(u => ({ id: u.id, email: u.email, role: u.role })));
    console.log('--- TRIPS ---');
    console.log(trips);
    console.log('--- ORDERS ---');
    console.log(orders);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
