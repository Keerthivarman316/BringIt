import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { 
      OR: [
        { email: 'Test1@gmail.com' },
        { id: 'cmnhxlcb00000o7t' }
      ]
    },
    data: { role: 'CARRIER' }
  });
  console.log(`Promoted ${result.count} users to CARRIER role.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
