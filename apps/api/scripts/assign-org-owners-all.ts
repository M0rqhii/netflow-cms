import { PrismaClient } from '@prisma/client';
import { CAPABILITY_REGISTRY } from '@repo/schemas';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set.');
  console.error('Please set DATABASE_URL in your environment or .env file.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Assigning Org Owner role to all organizations...\n');

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });

  console.log(`Found ${organizations.length} organizations\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const org of organizations) {
    console.log(`Processing: ${org.name} (${org.slug})...`);

    try {
      // Find or create Org Owner role for this organization
      let orgOwnerRole = await prisma.role.findFirst({
        where: {
          orgId: org.id,
          name: 'Org Owner',
          scope: 'ORG',
          type: 'SYSTEM',
        },
        select: { id: true, name: true },
      });

      if (!orgOwnerRole) {
        console.log(`  📋 Creating "Org Owner" role...`);
        
        // Get all capabilities from registry
        const allCapabilityKeys = CAPABILITY_REGISTRY.map(c => c.key);
        const capabilities = new Map<string, { id: string }>();
        
        for (const key of allCapabilityKeys) {
          const cap = await prisma.capability.findFirst({
            where: { key },
            select: { id: true },
          });
          if (cap) {
            capabilities.set(key, cap);
          }
        }

        if (capabilities.size === 0) {
          console.log(`  ⚠️  No capabilities found. Skipping.`);
          skipCount++;
          continue;
        }

        // Create Org Owner role
        orgOwnerRole = await prisma.role.create({
          data: {
            orgId: org.id,
            name: 'Org Owner',
            description: 'Full access to organization including billing and role management',
            type: 'SYSTEM',
            scope: 'ORG',
            isImmutable: true,
          },
          select: { id: true, name: true },
        });

        // Assign all capabilities to Org Owner
        const allCapabilityIds = Array.from(capabilities.values()).map(c => c.id);
        await prisma.roleCapability.createMany({
          data: allCapabilityIds.map(capId => ({
            roleId: orgOwnerRole!.id,
            capabilityId: capId,
          })),
        });

        console.log(`  ✅ Created "Org Owner" role with ${allCapabilityIds.length} capabilities`);
      }

      // Find users in this organization
      const users = await prisma.user.findMany({
        where: { orgId: org.id },
        select: { id: true, email: true, role: true },
      });

      if (users.length === 0) {
        console.log(`  ⚠️  No users found. Skipping.`);
        skipCount++;
        continue;
      }

      // Check if any user already has Org Owner role
      const existingOwnerAssignment = await prisma.userRole.findFirst({
        where: {
          orgId: org.id,
          roleId: orgOwnerRole.id,
          siteId: null,
        },
        include: {
          role: true,
        },
      });

      if (existingOwnerAssignment) {
        const existingOwner = users.find(u => u.id === existingOwnerAssignment.userId);
        console.log(`  ✅ Already has "Org Owner": ${existingOwner?.email || existingOwnerAssignment.userId}`);
        skipCount++;
        continue;
      }

      // Find the best candidate for owner:
      // 1. User with super_admin role
      // 2. User with org_admin role
      // 3. First user (alphabetically by email as fallback)
      let ownerCandidate = users.find(u => u.role === 'super_admin');
      if (!ownerCandidate) {
        ownerCandidate = users.find(u => u.role === 'org_admin');
      }
      if (!ownerCandidate) {
        // Sort by email and take first
        ownerCandidate = users.sort((a, b) => a.email.localeCompare(b.email))[0];
      }

      console.log(`  👤 Owner candidate: ${ownerCandidate.email} (role: ${ownerCandidate.role})`);

      // Check if user already has Org Owner role
      const existingAssignment = await prisma.userRole.findFirst({
        where: {
          orgId: org.id,
          userId: ownerCandidate.id,
          roleId: orgOwnerRole.id,
          siteId: null, // null for ORG scope roles
        },
      });

      if (existingAssignment) {
        console.log(`  ✅ Already has "Org Owner" role. Skipping.`);
        skipCount++;
        continue;
      }

      // Create assignment
      await prisma.userRole.create({
        data: {
          orgId: org.id,
          userId: ownerCandidate.id,
          roleId: orgOwnerRole.id,
          siteId: null, // null for ORG scope roles
        },
      });

      console.log(`  ✅ Assigned "Org Owner" role to ${ownerCandidate.email}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Error:`, error instanceof Error ? error.message : error);
      errorCount++;
    }

    console.log(''); // Empty line for readability
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Successfully assigned: ${successCount}`);
  console.log(`  ⏭️  Skipped (already assigned or missing data): ${skipCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📋 Total organizations: ${organizations.length}`);
  console.log('\n✅ Done!');
}

main()
  .catch((e) => {
    console.error('❌ Error assigning org owners:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
