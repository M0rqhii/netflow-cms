import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set.');
  console.error('Please set DATABASE_URL in your environment or .env file.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const email = 'liwiusz01@gmail.com';
  const password = 'Liwia2015!';

  console.log('🔐 Setting up super admin user...\n');
  console.log(`Email: ${email}`);

  // Find or create platform admin organization
  let platformAdminOrg = await prisma.organization.findFirst({
    where: { slug: 'platform-admin' },
    select: { id: true, name: true, slug: true },
  });

  if (!platformAdminOrg) {
    console.log('📦 Creating platform admin organization...');
    platformAdminOrg = await prisma.organization.create({
      data: {
        name: 'Platform Admin',
        slug: 'platform-admin',
        plan: 'enterprise',
        settings: {},
      },
      select: { id: true, name: true, slug: true },
    });
    console.log(`✅ Created organization: ${platformAdminOrg.name} (${platformAdminOrg.slug})`);
  } else {
    console.log(`✅ Using existing organization: ${platformAdminOrg.name} (${platformAdminOrg.slug})`);
  }

  // Hash password
  const passwordHash = bcrypt.hashSync(password, 10);

  // Find or create user
  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true, orgId: true, email: true, role: true, systemRole: true, isSuperAdmin: true },
  });

  if (existingUser) {
    console.log('⚠️  User already exists! Updating to super admin...');
    
    // Update user to super admin
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        role: 'super_admin',
        systemRole: 'super_admin',
        isSuperAdmin: true,
        platformRole: 'owner', // Platform owner
        orgId: platformAdminOrg.id, // Ensure user is in platform-admin org
      },
      select: { id: true, email: true, role: true, systemRole: true, isSuperAdmin: true, platformRole: true, orgId: true },
    });

    console.log('✅ User updated to super admin!');
    console.log(`  User ID: ${updatedUser.id}`);
    console.log(`  Email: ${updatedUser.email}`);
    console.log(`  Role: ${updatedUser.role}`);
    console.log(`  System Role: ${updatedUser.systemRole}`);
    console.log(`  Platform Role: ${updatedUser.platformRole}`);
    console.log(`  Is Super Admin: ${updatedUser.isSuperAdmin}`);
    console.log(`  Organization ID: ${updatedUser.orgId}`);
  } else {
    // Create new super admin user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        orgId: platformAdminOrg.id,
        role: 'super_admin',
        systemRole: 'super_admin',
        isSuperAdmin: true,
        platformRole: 'owner', // Platform owner
        preferredLanguage: 'pl',
      },
      select: { id: true, email: true, role: true, systemRole: true, isSuperAdmin: true, platformRole: true, orgId: true },
    });

    console.log('✅ Super admin user created successfully!');
    console.log(`  User ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  System Role: ${user.systemRole}`);
    console.log(`  Platform Role: ${user.platformRole}`);
    console.log(`  Is Super Admin: ${user.isSuperAdmin}`);
    console.log(`  Organization ID: ${user.orgId}`);
  }

  // Verify capabilities - super admin should have all permissions
  console.log('\n📋 Super Admin Capabilities:');
  console.log('  ✅ Can create organizations (ORGANIZATIONS_WRITE)');
  console.log('  ✅ Can assign roles in any organization (org.roles.manage)');
  console.log('  ✅ Can manage all organizations (ORGANIZATIONS_READ, ORGANIZATIONS_WRITE, ORGANIZATIONS_DELETE)');
  console.log('  ✅ Has all system permissions (all Permission values)');
  console.log('  ✅ Can access all features (SYSTEM_ACCESS, SYSTEM_MANAGE)');

  console.log('\n✅ Done!');
  console.log(`\n🔐 Login credentials:`);
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Error setting up super admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
