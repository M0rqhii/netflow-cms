import { PrismaClient } from '@prisma/client';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set.');
  console.error('Please set DATABASE_URL in your environment or .env file.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Assigning Org Owner role to Anna Nowak...\n');

  // Find organization
  const org = await prisma.organization.findFirst({
    where: { slug: 'techflow-solutions' },
    select: { id: true, name: true, slug: true },
  });

  if (!org) {
    console.error('❌ Organization "TechFlow Solutions" not found.');
    console.error('Please run seed-demo-org.ts first to create the organization.');
    process.exit(1);
  }

  console.log('✅ Found organization:', org.name, `(${org.slug})`);

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      orgId: org.id,
      email: 'anna.nowak@techflow-solutions.com',
    },
  });

  if (!user) {
    console.error('❌ User "anna.nowak@techflow-solutions.com" not found.');
    console.error('Please run seed-demo-org.ts first to create the user.');
    process.exit(1);
  }

  console.log('✅ Found user:', user.email);

  // Find Org Owner role
  const orgOwnerRole = await prisma.role.findFirst({
    where: {
      orgId: org.id,
      name: 'Org Owner',
      scope: 'ORG',
      type: 'SYSTEM',
    },
  });

  if (!orgOwnerRole) {
    console.error('❌ Role "Org Owner" (ORG scope) not found.');
    console.error('Please run seed-demo-org.ts first to create system roles.');
    process.exit(1);
  }

  console.log('✅ Found role:', orgOwnerRole.name, `(${orgOwnerRole.scope} scope)`);

  // Check if assignment already exists
  const existingAssignment = await prisma.userRole.findFirst({
    where: {
      orgId: org.id,
      userId: user.id,
      roleId: orgOwnerRole.id,
      siteId: null, // null for ORG scope roles
    },
  });

  if (existingAssignment) {
    console.log('ℹ️  Role "Org Owner" is already assigned to Anna Nowak.');
    console.log('✅ Assignment ID:', existingAssignment.id);
  } else {
    // Create assignment
    const assignment = await prisma.userRole.create({
      data: {
        orgId: org.id,
        userId: user.id,
        roleId: orgOwnerRole.id,
        siteId: null, // null for ORG scope roles
      },
    });

    console.log('✅ Successfully assigned "Org Owner" role to Anna Nowak!');
    console.log('✅ Assignment ID:', assignment.id);
  }

  // Verify assignment
  const assignments = await prisma.userRole.findMany({
    where: {
      orgId: org.id,
      userId: user.id,
    },
    include: {
      role: true,
    },
  });

  console.log('\n📋 Current role assignments for Anna Nowak:');
  assignments.forEach((assignment) => {
    console.log(`  - ${assignment.role.name} (${assignment.role.scope} scope, ${assignment.role.type})`);
  });

  console.log('\n✅ Done!');
}

main()
  .catch((e) => {
    console.error('❌ Error assigning role:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
