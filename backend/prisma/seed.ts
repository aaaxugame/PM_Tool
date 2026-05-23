import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const roles = [
    'SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER',
    'TEAM_MEMBER', 'CONTRACTOR', 'VENDOR_CONTACT', 'CLIENT',
  ];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name: name as any },
      update: {},
      create: { name: name as any },
    });
  }

  console.log('Seeded roles:', roles.join(', '));
}

main().catch(console.error).finally(() => prisma.$disconnect());
