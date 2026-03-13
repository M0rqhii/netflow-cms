import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CAPABILITY_REGISTRY } from '@repo/schemas';
import { buildSystemRoleDefinitions } from '../src/modules/rbac/system-role-definitions';

const prisma = new PrismaClient();

// Simple password hash function for seed data
// In production, use bcrypt or argon2
function hashPassword(password: string): string {
  // Use bcrypt for compatibility with AuthService
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo organizations
  const org1 = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Acme Corporation',
      slug: 'acme-corp',
      plan: 'pro',
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

  const org2 = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Demo Company',
      slug: 'demo-company',
      plan: 'free',
      settings: {
        default_language: 'en',
        timezone: 'UTC',
        features: {
          media_upload: false,
          custom_content_types: false,
        },
      },
    },
  });

  // Create sites for organizations
  const site1 = await prisma.site.upsert({
    where: { orgId_slug: { orgId: org1.id, slug: 'acme-corp-site' } },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      orgId: org1.id,
      name: 'Acme Corporation Site',
      slug: 'acme-corp-site',
      settings: {},
    },
  });

  const site2 = await prisma.site.upsert({
    where: { orgId_slug: { orgId: org2.id, slug: 'demo-company-site' } },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      orgId: org2.id,
      name: 'Demo Company Site',
      slug: 'demo-company-site',
      settings: {},
    },
  });

  console.log('✅ Created organizations:', org1.slug, org2.slug);
  console.log('✅ Created sites:', site1.slug, site2.slug);

  // Create users for org1
  // Note: In production, use bcrypt/argon2 for password hashing
  const passwordHash = hashPassword('password123');

  const adminUser = await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: org1.id,
        email: 'admin@acme-corp.com',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      orgId: org1.id,
      email: 'admin@acme-corp.com',
      passwordHash,
      role: 'org_admin',
      siteRole: 'admin',
      platformRole: 'admin',
    },
  });

  const editorUser = await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: org1.id,
        email: 'editor@acme-corp.com',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      orgId: org1.id,
      email: 'editor@acme-corp.com',
      passwordHash,
      role: 'editor',
      siteRole: 'editor',
      platformRole: 'user',
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: org1.id,
        email: 'viewer@acme-corp.com',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      orgId: org1.id,
      email: 'viewer@acme-corp.com',
      passwordHash,
      role: 'viewer',
      siteRole: 'viewer',
      platformRole: 'user',
    },
  });

  console.log('✅ Created users for org1:', adminUser.id, editorUser.id, viewerUser.id);
  await prisma.userOrg.createMany({
    data: [
      { userId: adminUser.id, orgId: org1.id, role: adminUser.role },
      { userId: editorUser.id, orgId: org1.id, role: editorUser.role },
      { userId: viewerUser.id, orgId: org1.id, role: viewerUser.role },
    ],
    skipDuplicates: true,
  });


  // Create content type for org1
  const articleContentType = await prisma.contentType.upsert({
    where: {
      siteId_slug: {
      siteId: site1.id,
        slug: 'article',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      siteId: site1.id,
      name: 'Article',
      slug: 'article',
      schema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
          },
          content: {
            type: 'string',
          },
          publishedAt: {
            type: 'string',
            format: 'date-time',
          },
          author: {
            type: 'string',
          },
        },
        required: ['title', 'content'],
      },
    },
  });

  console.log('✅ Created content type:', articleContentType.slug);

  // Create content entries
  const article1 = await prisma.contentEntry.upsert({
    where: { id: '00000000-0000-0000-0000-000000000030' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000030',
      siteId: site1.id,
      contentTypeId: articleContentType.id,
      status: 'published',
      data: {
        title: 'Welcome to Netflow CMS',
        content: '<p>This is your first article created with Netflow CMS.</p>',
        publishedAt: new Date().toISOString(),
        author: 'Admin',
      },
    },
  });

  const article2 = await prisma.contentEntry.upsert({
    where: { id: '00000000-0000-0000-0000-000000000031' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000031',
      siteId: site1.id,
      contentTypeId: articleContentType.id,
      status: 'draft',
      data: {
        title: 'Draft Article',
        content: '<p>This is a draft article.</p>',
        author: 'Editor',
      },
    },
  });

  console.log('✅ Created content entries:', article1.id, article2.id);

  // Create collection for org1
  const blogCollection = await prisma.collection.upsert({
    where: {
      siteId_slug: {
      siteId: site1.id,
        slug: 'blog-posts',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000040',
      siteId: site1.id,
      name: 'Blog Posts',
      slug: 'blog-posts',
      schemaJson: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
          },
          excerpt: {
            type: 'string',
            maxLength: 500,
          },
          body: {
            type: 'string',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        required: ['title', 'body'],
      },
    },
  });

  console.log('✅ Created collection:', blogCollection.slug);

  // Create collection items
  const blogPost1 = await prisma.collectionItem.upsert({
    where: { id: '00000000-0000-0000-0000-000000000050' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000050',
      siteId: site1.id,
      collectionId: blogCollection.id,
      status: 'PUBLISHED',
      version: 1,
      createdById: adminUser.id,
      updatedById: adminUser.id,
      publishedAt: new Date(),
      data: {
        title: 'Getting Started with Netflow CMS',
        excerpt: 'Learn how to use Netflow CMS to manage your content.',
        body: '<p>Netflow CMS is a powerful multi-org headless CMS...</p>',
        tags: ['tutorial', 'getting-started'],
      },
      etag: 'etag-1',
    },
  });

  const blogPost2 = await prisma.collectionItem.upsert({
    where: { id: '00000000-0000-0000-0000-000000000051' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000051',
      siteId: site1.id,
      collectionId: blogCollection.id,
      status: 'DRAFT',
      version: 1,
      createdById: editorUser.id,
      updatedById: editorUser.id,
      data: {
        title: 'Advanced Features',
        excerpt: 'Discover advanced features of Netflow CMS.',
        body: '<p>This article covers advanced features...</p>',
        tags: ['advanced'],
      },
      etag: 'etag-2',
    },
  });

  console.log('✅ Created collection items:', blogPost1.id, blogPost2.id);

  // Create media files for org1
  const mediaFile1 = await prisma.mediaItem.upsert({
    where: { id: '00000000-0000-0000-0000-000000000060' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000060',
      siteId: site1.id,
      fileName: 'hero-image.jpg',
      path: '/media/hero-image.jpg',
      url: 'https://example.com/media/hero-image.jpg',
      mimeType: 'image/jpeg',
      size: 245760,
      width: 1920,
      height: 1080,
      alt: 'Hero image',
      metadata: {
        camera: 'Canon EOS 5D',
        location: 'Warsaw, Poland',
      },
      uploadedById: adminUser.id,
    },
  });

  const mediaFile2 = await prisma.mediaItem.upsert({
    where: { id: '00000000-0000-0000-0000-000000000061' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000061',
      siteId: site1.id,
      fileName: 'document.pdf',
      path: '/media/document.pdf',
      url: 'https://example.com/media/document.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      metadata: {},
      uploadedById: editorUser.id,
    },
  });

  console.log('✅ Created media files:', mediaFile1.id, mediaFile2.id);

  // Create user for org2
  const org2User = await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: org2.id,
        email: 'user@demo-company.com',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000070',
      orgId: org2.id,
      email: 'user@demo-company.com',
      passwordHash,
      role: 'org_admin',
      siteRole: 'admin',
      platformRole: 'admin',
    },
  });

  console.log('✅ Created user for org2:', org2User.id);
  await prisma.userOrg.createMany({
    data: [
      { userId: org2User.id, orgId: org2.id, role: org2User.role },
    ],
    skipDuplicates: true,
  });


  // ============================================
  // RBAC SEEDING - Capabilities, Roles, Policies
  // ============================================
  console.log('\n🔐 Seeding RBAC...');

  const capabilitiesData = CAPABILITY_REGISTRY.map((capability) => ({
    key: capability.key,
    module: capability.module,
    label: capability.label,
    description: capability.description,
    riskLevel: capability.riskLevel,
    isDangerous: capability.isDangerous,
  }));

  // Seed capabilities
  const capabilities = new Map<string, any>();
  for (const capData of capabilitiesData) {
    const cap = await prisma.capability.upsert({
      where: { key: capData.key },
      update: capData,
      create: capData,
    });
    capabilities.set(cap.key, cap);
  }
  console.log(`✅ Seeded ${capabilities.size} capabilities`);

  // Helper function to get capability IDs by keys
  const getCapabilityIds = (keys: string[]): string[] => {
    return keys.map(key => {
      const cap = capabilities.get(key);
      if (!cap) throw new Error(`Capability not found: ${key}`);
      return cap.id;
    });
  };
  const systemRoleDefinitions = buildSystemRoleDefinitions(capabilitiesData.map((capability) => capability.key));
  const systemRoleMap = new Map(systemRoleDefinitions.map((role) => [`${role.scope}:${role.name}`, role]));

  // Seed system roles for org1 (Acme Corp)
  console.log('📋 Creating system roles for org1...');

  // ORG scope roles
  const orgOwnerRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Org Owner',
        scope: 'ORG',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
      name: 'Org Owner',
      description: 'Full access to organization including billing and role management',
      type: 'SYSTEM',
      scope: 'ORG',
      isImmutable: true,
    },
  });

  // Org Owner gets all tenant capabilities (without platform.*)
  const allCapabilityIds = getCapabilityIds(systemRoleMap.get('ORG:Org Owner')?.capabilityKeys || []);
  await prisma.roleCapability.deleteMany({ where: { roleId: orgOwnerRole.id } });
  await prisma.roleCapability.createMany({
    data: allCapabilityIds.map(capId => ({
      roleId: orgOwnerRole.id,
      capabilityId: capId,
    })),
  });

  const orgAdminRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Org Admin',
        scope: 'ORG',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
      name: 'Org Admin',
      description: 'Full technical access except billing and role management',
      type: 'SYSTEM',
      scope: 'ORG',
      isImmutable: true,
    },
  });

  const orgAdminCapabilities = systemRoleMap.get('ORG:Org Admin')?.capabilityKeys || [];
  await prisma.roleCapability.deleteMany({ where: { roleId: orgAdminRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds(orgAdminCapabilities).map(capId => ({
      roleId: orgAdminRole.id,
      capabilityId: capId,
    })),
  });

  const orgMemberRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Org Member',
        scope: 'ORG',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
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
  const siteAdminRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Site Admin',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
      name: 'Site Admin',
      description: 'Full access to site builder, content, and site settings',
      type: 'SYSTEM',
      scope: 'SITE',
      isImmutable: true,
    },
  });

  const siteAdminCapabilities = systemRoleMap.get('SITE:Site Admin')?.capabilityKeys || [];
  await prisma.roleCapability.deleteMany({ where: { roleId: siteAdminRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds(siteAdminCapabilities).map(capId => ({
      roleId: siteAdminRole.id,
      capabilityId: capId,
    })),
  });

  const editorInChiefRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Editor-in-Chief',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
      name: 'Editor-in-Chief',
      description: 'Can edit, save drafts, publish, and rollback',
      type: 'SYSTEM',
      scope: 'SITE',
      isImmutable: true,
    },
  });

  await prisma.roleCapability.deleteMany({ where: { roleId: editorInChiefRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds([
      ...(systemRoleMap.get('SITE:Editor-in-Chief')?.capabilityKeys || []),
    ]).map(capId => ({
      roleId: editorInChiefRole.id,
      capabilityId: capId,
    })),
  });

  const editorRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Editor',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
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
      ...(systemRoleMap.get('SITE:Editor')?.capabilityKeys || []),
    ]).map(capId => ({
      roleId: editorRole.id,
      capabilityId: capId,
    })),
  });

  const publisherRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Publisher',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
      name: 'Publisher',
      description: 'Can publish and rollback, but cannot edit',
      type: 'SYSTEM',
      scope: 'SITE',
      isImmutable: true,
    },
  });

  await prisma.roleCapability.deleteMany({ where: { roleId: publisherRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds([
      ...(systemRoleMap.get('SITE:Publisher')?.capabilityKeys || []),
    ]).map(capId => ({
      roleId: publisherRole.id,
      capabilityId: capId,
    })),
  });

  const viewerRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Viewer',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
      name: 'Viewer',
      description: 'Read-only access to builder, content, and analytics',
      type: 'SYSTEM',
      scope: 'SITE',
      isImmutable: true,
    },
  });

  await prisma.roleCapability.deleteMany({ where: { roleId: viewerRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds([
      ...(systemRoleMap.get('SITE:Viewer')?.capabilityKeys || []),
    ]).map(capId => ({
      roleId: viewerRole.id,
      capabilityId: capId,
    })),
  });

  // Marketing roles (SITE scope)
  const marketingManagerRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Marketing Manager',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
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
      ...(systemRoleMap.get('SITE:Marketing Manager')?.capabilityKeys || []),
    ]).map(capId => ({
      roleId: marketingManagerRole.id,
      capabilityId: capId,
    })),
  });

  const marketingEditorRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Marketing Editor',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
      name: 'Marketing Editor',
      description: 'Can edit marketing content',
      type: 'SYSTEM',
      scope: 'SITE',
      isImmutable: true,
    },
  });

  await prisma.roleCapability.deleteMany({ where: { roleId: marketingEditorRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds([
      ...(systemRoleMap.get('SITE:Marketing Editor')?.capabilityKeys || []),
    ]).map(capId => ({
      roleId: marketingEditorRole.id,
      capabilityId: capId,
    })),
  });

  const marketingPublisherRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Marketing Publisher',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
      name: 'Marketing Publisher',
      description: 'Can publish marketing content',
      type: 'SYSTEM',
      scope: 'SITE',
      isImmutable: true,
    },
  });

  await prisma.roleCapability.deleteMany({ where: { roleId: marketingPublisherRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds([
      ...(systemRoleMap.get('SITE:Marketing Publisher')?.capabilityKeys || []),
    ]).map(capId => ({
      roleId: marketingPublisherRole.id,
      capabilityId: capId,
    })),
  });

  const marketingViewerRole = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: org1.id,
        name: 'Marketing Viewer',
        scope: 'SITE',
      },
    },
    update: {},
    create: {
      orgId: org1.id,
      name: 'Marketing Viewer',
      description: 'Read-only access to marketing',
      type: 'SYSTEM',
      scope: 'SITE',
      isImmutable: true,
    },
  });

  await prisma.roleCapability.deleteMany({ where: { roleId: marketingViewerRole.id } });
  await prisma.roleCapability.createMany({
    data: getCapabilityIds([
      ...(systemRoleMap.get('SITE:Marketing Viewer')?.capabilityKeys || []),
    ]).map(capId => ({
      roleId: marketingViewerRole.id,
      capabilityId: capId,
    })),
  });

  console.log('✅ Created system roles for org1');

  const platformRoles = new Map<string, any>();
  const platformRoleDefinitions = systemRoleDefinitions.filter((role) => role.scope === 'PLATFORM');
  for (const roleDef of platformRoleDefinitions) {
    const role = await prisma.platformRole.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        type: 'SYSTEM',
        isImmutable: true,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        type: 'SYSTEM',
        isImmutable: true,
      },
    });

    await prisma.platformRoleCapability.deleteMany({ where: { roleId: role.id } });
    await prisma.platformRoleCapability.createMany({
      data: getCapabilityIds(roleDef.capabilityKeys).map((capId) => ({
        roleId: role.id,
        capabilityId: capId,
      })),
    });

    platformRoles.set(role.name, role);
  }

  console.log(`✅ Created platform roles: ${platformRoleDefinitions.length}`);

  // Seed default OrgPolicy for org1
  // Most capabilities enabled by default, but risky ones disabled
  const riskyCapabilities = [
    'builder.rollback',
    'marketing.ads.manage',
    'marketing.schedule',
  ];

  const tenantCapabilitiesData = capabilitiesData.filter((capability) => !capability.key.startsWith('platform.'));
  for (const capData of tenantCapabilitiesData) {
    const enabled = !riskyCapabilities.includes(capData.key);
    await prisma.orgPolicy.upsert({
      where: {
        orgId_capabilityKey: {
          orgId: org1.id,
          capabilityKey: capData.key,
        },
      },
      update: { enabled },
      create: {
        orgId: org1.id,
        capabilityKey: capData.key,
        enabled,
        createdByUserId: adminUser.id,
      },
    });
  }

  console.log('✅ Created org policies for org1');

  // Assign Org Owner role to adminUser
  await prisma.userRole.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000100',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000100',
      orgId: org1.id,
      userId: adminUser.id,
      roleId: orgOwnerRole.id,
      siteId: null, // ORG scope
    },
  });

  console.log('✅ Assigned Org Owner role to adminUser');

  console.log('\n🎉 Seed completed successfully!');
  // Create super admin user (liwiusz01@gmail.com)
  const superAdminPasswordHash = hashPassword('Liwia2015!');
  const superAdminOrg = await prisma.organization.findFirst({
    where: { slug: 'platform-admin' },
  });

  let platformAdminOrg;
  if (!superAdminOrg) {
    platformAdminOrg = await prisma.organization.upsert({
      where: { slug: 'platform-admin' },
      update: {},
      create: {
        name: 'Platform Admin',
        slug: 'platform-admin',
        plan: 'enterprise',
        settings: {},
      },
    });
  } else {
    platformAdminOrg = superAdminOrg;
  }

  const superAdminUser = await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: platformAdminOrg.id,
        email: 'liwiusz01@gmail.com',
      },
    },
    update: {
      passwordHash: superAdminPasswordHash,
      role: 'super_admin',
    },
    create: {
      orgId: platformAdminOrg.id,
      email: 'liwiusz01@gmail.com',
      passwordHash: superAdminPasswordHash,
      role: 'super_admin',
      preferredLanguage: 'pl',
    },
  });

  console.log('✅ Created/Updated super admin user:', superAdminUser.email);

  const platformRootRole = platformRoles.get('Platform Root');
  if (platformRootRole) {
    await prisma.platformUserRole.upsert({
      where: {
        userId_roleId: {
          userId: superAdminUser.id,
          roleId: platformRootRole.id,
        },
      },
      update: {},
      create: {
        userId: superAdminUser.id,
        roleId: platformRootRole.id,
      },
    });
  }

  console.log('\n📋 Summary:');
  console.log(`  - Tenants: 3 (acme-corp, demo-company, platform-admin)`);
  console.log(`  - Users: 5 (3 for acme-corp, 1 for demo-company, 1 super admin)`);
  console.log(`  - Content Types: 1 (article)`);
  console.log(`  - Content Entries: 2`);
  console.log(`  - Collections: 1 (blog-posts)`);
  console.log(`  - Collection Items: 2`);
  console.log(`  - Media Files: 2`);
  console.log(`  - Capabilities: ${capabilities.size}`);
  console.log(`  - System Roles: ${systemRoleDefinitions.length} (4 PLATFORM, 3 ORG, 9 SITE)`);
  console.log(`  - Org Policies: ${tenantCapabilitiesData.length} (for org1)`);
  console.log('\n🔐 Default password for all users: password123');
  console.log('🔐 Super admin (liwiusz01@gmail.com) password: Liwia2015!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
