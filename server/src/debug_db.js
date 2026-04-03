import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const matches = await prisma.match.findMany({
      include: {
        order: true,
        carrier: { select: { id: true, name: true, email: true } }
      }
    });
    console.log('--- ALL MATCHES ---');
    console.log(JSON.stringify(matches, null, 2));
    
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true, totalEarnings: true, deliveryCount: true }
    });
    console.log('--- ALL USERS ---');
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
