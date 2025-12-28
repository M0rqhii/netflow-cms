/**
 * Script to create a super admin user
 * Usage: npx ts-node scripts/create-super-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'liwiusz01@gmail.com';
  const password = 'Liwia2015!';
  const role = 'super_admin';

  console.log('🔐 Creating super admin user...');
  console.log(`Email: ${email}`);
  console.log(`Role: ${role}`);

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: { email },
  });

  if (existingUser) {
    console.log('⚠️  User already exists! Updating password and role...');
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Update user
    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        role: role as any,
      },
    });

    console.log('✅ User updated successfully!');
    console.log(`User ID: ${user.id}`);
    console.log(`Tenant ID: ${user.tenantId}`);
    console.log(`Role: ${user.role}`);
    return;
  }

  // Find or create a tenant for super admin
  // Super admins typically belong to a special tenant
  let tenant = await prisma.tenant.findFirst({
    where: { slug: 'platform-admin' },
  });

  if (!tenant) {
    console.log('📦 Creating platform admin tenant...');
    tenant = await prisma.tenant.create({
      data: {
        name: 'Platform Admin',
        slug: 'platform-admin',
        plan: 'enterprise',
        settings: {},
      },
    });
    console.log(`✅ Created tenant: ${tenant.slug} (${tenant.id})`);
  } else {
    console.log(`✅ Using existing tenant: ${tenant.slug} (${tenant.id})`);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      tenantId: tenant.id,
      role: role as any,
      preferredLanguage: 'pl',
    },
  });

  console.log('✅ Super admin user created successfully!');
  console.log(`User ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
  console.log(`Tenant ID: ${user.tenantId}`);
  console.log(`Tenant: ${tenant.name} (${tenant.slug})`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





