import { PrismaClient } from '@prisma/client';
import { EnvironmentType, PageStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set.');
  console.error('Please set DATABASE_URL in your environment or .env file.');
  process.exit(1);
}

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
}

async function main() {
  console.log('🌱 Seeding demo organization "TechFlow Solutions"...\n');

  // ============================================
  // 1. Create Organization
  // ============================================
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'techflow-solutions' },
    update: {},
    create: {
      name: 'TechFlow Solutions',
      slug: 'techflow-solutions',
      plan: 'professional',
      settings: {
        default_language: 'pl',
        timezone: 'Europe/Warsaw',
        features: {
          media_upload: true,
          custom_content_types: true,
        },
      },
    },
  });

  // Create site for organization
  const demoSite = await prisma.site.upsert({
    where: { orgId_slug: { orgId: demoOrg.id, slug: 'techflow-solutions-site' } },
    update: {},
    create: {
      orgId: demoOrg.id,
      name: 'TechFlow Solutions Site',
      slug: 'techflow-solutions-site',
      settings: {},
    },
  });

  console.log('✅ Created organization:', demoOrg.name, `(${demoOrg.slug})`);
  console.log('✅ Created site:', demoSite.name, `(${demoSite.slug})`);

  // ============================================
  // 2. Create Users
  // ============================================
  const passwordHash = hashPassword('demo123');

  const ownerUser = await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: demoOrg.id,
        email: 'anna.nowak@techflow-solutions.com',
      },
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      email: 'anna.nowak@techflow-solutions.com',
      passwordHash,
      role: 'tenant_admin',
      preferredLanguage: 'pl',
    },
  });

  const editorUser = await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: demoOrg.id,
        email: 'tomasz.wisniewski@techflow-solutions.com',
      },
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      email: 'tomasz.wisniewski@techflow-solutions.com',
      passwordHash,
      role: 'editor',
      preferredLanguage: 'pl',
    },
  });

  const marketingUser = await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: demoOrg.id,
        email: 'maria.kowalska@techflow-solutions.com',
      },
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      email: 'maria.kowalska@techflow-solutions.com',
      passwordHash,
      role: 'tenant_admin',
      preferredLanguage: 'pl',
    },
  });

  console.log('✅ Created users:');
  console.log(`   - Owner: ${ownerUser.email}`);
  console.log(`   - Editor: ${editorUser.email}`);
  console.log(`   - Marketing Manager: ${marketingUser.email}`);

  // ============================================
  // 3. Get or Create Capabilities
  // ============================================
  // Check if capabilities table exists
  let capabilitiesExist = false;
  try {
    await prisma.capability.findFirst({ take: 1 });
    capabilitiesExist = true;
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('⚠️  Capabilities table does not exist. Skipping RBAC setup.');
      console.log('   Please run main seed script first: npm run db:seed');
      capabilitiesExist = false;
    } else {
      throw error;
    }
  }

  if (!capabilitiesExist) {
    console.log('\n⚠️  Cannot create roles without capabilities.');
    console.log('   Demo organization created, but roles are not assigned.');
    console.log('   Please run: npm run db:seed (after fixing database schema)');
    console.log('   Then run this script again to assign roles.');
    return;
  }

  const allCapabilityKeys = [
    // Organization module
    'org.view_dashboard',
    'org.users.view',
    'org.users.invite',
    'org.users.remove',
    'org.roles.view',
    'org.roles.manage',
    'org.policies.view',
    'org.policies.manage',
    // Billing module
    'billing.view_plan',
    'billing.change_plan',
    'billing.view_invoices',
    'billing.manage_payment_methods',
    // Sites module
    'sites.view',
    'sites.create',
    'sites.delete',
    'sites.settings.view',
    'sites.settings.manage',
    // Builder module
    'builder.view',
    'builder.edit',
    'builder.draft.save',
    'builder.publish',
    'builder.rollback',
    'builder.history.view',
    'builder.assets.upload',
    'builder.assets.delete',
    'builder.custom_code',
    'builder.site_roles.manage',
    // Content/CMS module
    'content.view',
    'content.create',
    'content.edit',
    'content.delete',
    'content.publish',
    'content.media.manage',
    // Marketing module
    'marketing.view',
    'marketing.content.edit',
    'marketing.schedule',
    'marketing.publish',
    'marketing.campaign.manage',
    'marketing.social.connect',
    'marketing.ads.manage',
    'marketing.stats.view',
    // Analytics module
    'analytics.view',
  ];

  const capabilities = new Map<string, any>();
  for (const key of allCapabilityKeys) {
    const cap = await prisma.capability.findUnique({
      where: { key },
    });
    if (cap) {
      capabilities.set(key, cap);
    }
  }

  if (capabilities.size === 0) {
    console.log('⚠️  No capabilities found. Please run main seed script first to create capabilities.');
    return;
  }

  console.log(`✅ Found ${capabilities.size} capabilities`);

  // Helper function to get capability IDs by keys
  const getCapabilityIds = (keys: string[]): string[] => {
    return keys.map(key => {
      const cap = capabilities.get(key);
      if (!cap) throw new Error(`Capability not found: ${key}`);
      return cap.id;
    });
  };

  // ============================================
  // 4. Create System Roles for Demo Org
  // ============================================
  console.log('\n📋 Creating system roles for demo organization...');

  // ORG scope roles
  const orgOwnerRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: demoOrg.id,
        name: 'Org Owner',
        scope: 'ORG',
      },
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      name: 'Org Owner',
      description: 'Full access to organization including billing and role management',
      type: 'SYSTEM',
      scope: 'ORG',
      isImmutable: true,
    },
  });

  // Org Owner gets ALL capabilities
  const allCapabilityIds = getCapabilityIds(allCapabilityKeys);
  await prisma.roleCapability.deleteMany({ where: { roleId: orgOwnerRole.id } });
  await prisma.roleCapability.createMany({
    data: allCapabilityIds.map(capId => ({
      roleId: orgOwnerRole.id,
      capabilityId: capId,
    })),
  });

  const orgMemberRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: demoOrg.id,
        name: 'Org Member',
        scope: 'ORG',
      },
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      name: 'Org Member',
      description: 'Basic organization member with minimal permissions',
      type: 'SYSTEM',
      scope: 'ORG',
      isImmutable: true,
    },
  });

  // Org Member gets minimal permissions
  await prisma.roleCapability.deleteMany({ where: { roleId: orgMemberRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds(['org.view_dashboard', 'sites.view']).map(capId => ({
      roleId: orgMemberRole.id,
      capabilityId: capId,
    })),
  });

  // SITE scope roles
  const ownerRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: demoOrg.id,
        name: 'Owner',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      name: 'Owner',
      description: 'Full access to site including all builder, content, and marketing features',
      type: 'SYSTEM',
      scope: 'SITE',
      isImmutable: true,
    },
  });

  // Owner gets all site capabilities
  const ownerCapabilities = [
    'builder.view', 'builder.edit', 'builder.draft.save', 'builder.publish',
    'builder.rollback', 'builder.history.view', 'builder.assets.upload',
    'builder.assets.delete', 'builder.custom_code', 'builder.site_roles.manage',
    'content.view', 'content.create', 'content.edit', 'content.delete', 'content.publish',
    'content.media.manage', 'sites.settings.view', 'sites.settings.manage',
    'marketing.view', 'marketing.content.edit', 'marketing.publish',
    'marketing.campaign.manage', 'marketing.stats.view', 'marketing.schedule',
    'marketing.ads.manage', 'marketing.social.connect',
  ];
  await prisma.roleCapability.deleteMany({ where: { roleId: ownerRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds(ownerCapabilities).map(capId => ({
      roleId: ownerRole.id,
      capabilityId: capId,
    })),
  });

  const editorRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: demoOrg.id,
        name: 'Editor',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      name: 'Editor',
      description: 'Can edit and save drafts, but cannot publish',
      type: 'SYSTEM',
      scope: 'SITE',
      isImmutable: true,
    },
  });

  await prisma.roleCapability.deleteMany({ where: { roleId: editorRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds([
      'builder.view', 'builder.edit', 'builder.draft.save', 'builder.history.view',
      'content.view', 'content.create', 'content.edit', 'content.media.manage',
    ]).map(capId => ({
      roleId: editorRole.id,
      capabilityId: capId,
    })),
  });

  const marketingManagerRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: demoOrg.id,
        name: 'Marketing Manager',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      name: 'Marketing Manager',
      description: 'Full marketing access including campaigns and ads',
      type: 'SYSTEM',
      scope: 'SITE',
      isImmutable: true,
    },
  });

  await prisma.roleCapability.deleteMany({ where: { roleId: marketingManagerRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds([
      'marketing.view', 'marketing.content.edit', 'marketing.publish',
      'marketing.campaign.manage', 'marketing.stats.view', 'marketing.schedule',
      'marketing.ads.manage', 'marketing.social.connect',
      'builder.view', 'builder.publish', // Can publish pages
      'content.view', 'content.publish',
    ]).map(capId => ({
      roleId: marketingManagerRole.id,
      capabilityId: capId,
    })),
  });

  console.log('✅ Created system roles for demo organization');

  // ============================================
  // 5. Assign Roles to Users
  // ============================================
  console.log('\n👥 Assigning roles to users...');

  // Helper function to assign role
  const assignRole = async (userId: string, roleId: string, siteId: string | null) => {
    const existing = await prisma.userRole.findFirst({
      where: {
        orgId: demoOrg.id,
        userId,
        roleId,
        siteId,
      },
    });

    if (!existing) {
      await prisma.userRole.create({
        data: {
          orgId: demoOrg.id,
          userId,
          roleId,
          siteId,
        },
      });
    }
  };

  // Owner: Org Owner (ORG) + Owner (SITE)
  await assignRole(ownerUser.id, orgOwnerRole.id, null); // ORG scope
  await assignRole(ownerUser.id, ownerRole.id, demoOrg.id); // SITE scope

  // Editor: Org Member (ORG) + Editor (SITE)
  await assignRole(editorUser.id, orgMemberRole.id, null); // ORG scope
  await assignRole(editorUser.id, editorRole.id, demoOrg.id); // SITE scope

  // Marketing Manager: Org Member (ORG) + Marketing Manager (SITE)
  await assignRole(marketingUser.id, orgMemberRole.id, null); // ORG scope
  await assignRole(marketingUser.id, marketingManagerRole.id, demoOrg.id); // SITE scope

  console.log('✅ Assigned roles to users');

  // ============================================
  // 6. Create Org Policies
  // ============================================
  console.log('\n📜 Creating org policies...');

  const riskyCapabilities = [
    'builder.rollback',
    'marketing.ads.manage',
    'marketing.schedule',
  ];

  for (const key of allCapabilityKeys) {
    const enabled = !riskyCapabilities.includes(key);
    await prisma.orgPolicy.upsert({
      where: {
        orgId_capabilityKey: {
          orgId: demoOrg.id,
          capabilityKey: key,
        },
      },
      update: { enabled },
      create: {
        orgId: demoOrg.id,
        capabilityKey: key,
        enabled,
        createdByUserId: ownerUser.id,
      },
    });
  }

  console.log('✅ Created org policies');

  // ============================================
  // 7. Create Environments
  // ============================================
  console.log('\n🌍 Creating environments...');

  const draftEnv = await prisma.siteEnvironment.upsert({
    where: {
      siteId_type: {
        siteId: demoSite.id,
        type: EnvironmentType.DRAFT,
      },
    },
    update: {},
    create: {
        siteId: demoSite.id,
        type: EnvironmentType.DRAFT,
    },
  });

  const productionEnv = await prisma.siteEnvironment.upsert({
    where: {
      siteId_type: {
        siteId: demoSite.id,
        type: EnvironmentType.PRODUCTION,
      },
    },
    update: {},
    create: {
      siteId: demoSite.id,
      type: EnvironmentType.PRODUCTION,
    },
  });

  console.log('✅ Created environments: DRAFT, PRODUCTION');
  console.log(`   - Draft environment ID: ${draftEnv.id}`);
  console.log(`   - Production environment ID: ${productionEnv.id}`);

  // ============================================
  // 8. Create Demo Page
  // ============================================
  console.log('\n📄 Creating demo page...');

  const pageContent = {
    sections: [
      {
        type: 'hero',
        title: 'Transformacja Cyfrowa dla Twojej Firmy',
        subtitle: 'Pomagamy firmom wykorzystać pełny potencjał technologii',
        cta: {
          text: 'Skontaktuj się z nami',
          link: '/contact',
        },
        backgroundImage: '/images/hero-bg.jpg',
      },
      {
        type: 'features',
        title: 'Nasze Usługi',
        items: [
          {
            title: 'Konsultacje Strategiczne',
            description: 'Pomagamy zaplanować transformację cyfrową',
            icon: 'strategy',
          },
          {
            title: 'Wdrożenia Technologiczne',
            description: 'Implementujemy nowoczesne rozwiązania',
            icon: 'implementation',
          },
          {
            title: 'Szkolenia i Wsparcie',
            description: 'Przeszkalamy zespoły i zapewniamy wsparcie',
            icon: 'training',
          },
        ],
      },
      {
        type: 'testimonials',
        title: 'Co mówią nasi klienci',
        items: [
          {
            name: 'Jan Kowalski',
            company: 'ABC Corp',
            text: 'TechFlow pomogło nam zmodernizować nasze procesy',
            rating: 5,
          },
        ],
      },
      {
        type: 'cta',
        title: 'Gotowy na transformację?',
        subtitle: 'Skontaktuj się z nami już dziś',
        buttonText: 'Umów bezpłatną konsultację',
        buttonLink: '/contact',
      },
    ],
    seo: {
      metaTitle: 'TechFlow Solutions - Transformacja Cyfrowa',
      metaDescription: 'Pomagamy firmom w transformacji cyfrowej. Konsultacje, wdrożenia, szkolenia.',
      ogImage: '/images/og-image.jpg',
    },
  };

  const demoPage = await prisma.page.upsert({
    where: {
      site_env_slug: {
        siteId: demoSite.id,
        environmentId: draftEnv.id,
        slug: 'home',
      },
    },
    update: {
      title: 'TechFlow Solutions - Transformacja Cyfrowa',
      content: pageContent as any,
      status: PageStatus.DRAFT,
    },
    create: {
      siteId: demoSite.id,
      environmentId: draftEnv.id,
      slug: 'home',
      title: 'TechFlow Solutions - Transformacja Cyfrowa',
      status: PageStatus.DRAFT,
      content: pageContent as any,
    },
  });

  console.log('✅ Created demo page:', demoPage.slug);

  // ============================================
  // Summary
  // ============================================
  console.log('\n🎉 Demo organization seeded successfully!\n');
  console.log('📋 Summary:');
  console.log(`  - Organization: ${demoOrg.name} (${demoOrg.slug})`);
  console.log(`  - Users: 3`);
  console.log(`    • Owner: ${ownerUser.email}`);
  console.log(`    • Editor: ${editorUser.email}`);
  console.log(`    • Marketing Manager: ${marketingUser.email}`);
  console.log(`  - Roles: 5 system roles created`);
  console.log(`  - Environments: 2 (DRAFT, PRODUCTION)`);
  console.log(`  - Pages: 1 (home in DRAFT)`);
  console.log(`  - Org Policies: ${allCapabilityKeys.length} policies created`);
  console.log('\n🔐 Default password for all users: demo123');
  console.log('\n📖 See docs/demo/DEMO_ORGANIZATION.md for full demo flow');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding demo organization:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

