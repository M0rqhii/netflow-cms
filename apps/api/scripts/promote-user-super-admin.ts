import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const email = 'liwiusz01@gmail.com';

  console.log(`Promoting user to super admin: ${email}`);

  const user = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      orgId: true,
      role: true,
      siteRole: true,
      platformRole: true,
      systemRole: true,
      isSuperAdmin: true,
    },
  });

  if (!user) {
    console.error('User not found.');
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'super_admin',
      systemRole: 'super_admin',
      isSuperAdmin: true,
      platformRole: 'owner',
      siteRole: 'owner',
    },
    select: {
      id: true,
      email: true,
      orgId: true,
      role: true,
      siteRole: true,
      platformRole: true,
      systemRole: true,
      isSuperAdmin: true,
    },
  });

  console.log('Updated user:');
  console.log(updated);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
