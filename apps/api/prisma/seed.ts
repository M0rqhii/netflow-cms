import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  // Create demo tenants
  const tenant1 = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Acme Corporation',
      slug: 'acme-corp',
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

  const tenant2 = await prisma.tenant.upsert({
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

  console.log('✅ Created tenants:', tenant1.slug, tenant2.slug);

  // Create users for tenant1
  // Note: In production, use bcrypt/argon2 for password hashing
  const passwordHash = hashPassword('password123');

  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant1.id,
        email: 'admin@acme-corp.com',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      tenantId: tenant1.id,
      email: 'admin@acme-corp.com',
      passwordHash,
      role: 'tenant_admin',
    },
  });

  const editorUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant1.id,
        email: 'editor@acme-corp.com',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      tenantId: tenant1.id,
      email: 'editor@acme-corp.com',
      passwordHash,
      role: 'editor',
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant1.id,
        email: 'viewer@acme-corp.com',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      tenantId: tenant1.id,
      email: 'viewer@acme-corp.com',
      passwordHash,
      role: 'viewer',
    },
  });

  console.log('✅ Created users for tenant1:', adminUser.id, editorUser.id, viewerUser.id);

  // Create content type for tenant1
  const articleContentType = await prisma.contentType.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant1.id,
        slug: 'article',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      tenantId: tenant1.id,
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
      tenantId: tenant1.id,
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
      tenantId: tenant1.id,
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

  // Create collection for tenant1
  const blogCollection = await prisma.collection.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant1.id,
        slug: 'blog-posts',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000040',
      tenantId: tenant1.id,
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
      tenantId: tenant1.id,
      collectionId: blogCollection.id,
      status: 'PUBLISHED',
      version: 1,
      createdById: adminUser.id,
      updatedById: adminUser.id,
      publishedAt: new Date(),
      data: {
        title: 'Getting Started with Netflow CMS',
        excerpt: 'Learn how to use Netflow CMS to manage your content.',
        body: '<p>Netflow CMS is a powerful multi-tenant headless CMS...</p>',
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
      tenantId: tenant1.id,
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

  // Create media files for tenant1
  const mediaFile1 = await prisma.mediaFile.upsert({
    where: { id: '00000000-0000-0000-0000-000000000060' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000060',
      tenantId: tenant1.id,
      filename: 'hero-image.jpg',
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

  const mediaFile2 = await prisma.mediaFile.upsert({
    where: { id: '00000000-0000-0000-0000-000000000061' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000061',
      tenantId: tenant1.id,
      filename: 'document.pdf',
      url: 'https://example.com/media/document.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      metadata: {},
      uploadedById: editorUser.id,
    },
  });

  console.log('✅ Created media files:', mediaFile1.id, mediaFile2.id);

  // Create user for tenant2
  const tenant2User = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant2.id,
        email: 'user@demo-company.com',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000070',
      tenantId: tenant2.id,
      email: 'user@demo-company.com',
      passwordHash,
      role: 'tenant_admin',
    },
  });

  console.log('✅ Created user for tenant2:', tenant2User.id);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`  - Tenants: 2 (acme-corp, demo-company)`);
  console.log(`  - Users: 4 (3 for acme-corp, 1 for demo-company)`);
  console.log(`  - Content Types: 1 (article)`);
  console.log(`  - Content Entries: 2`);
  console.log(`  - Collections: 1 (blog-posts)`);
  console.log(`  - Collection Items: 2`);
  console.log(`  - Media Files: 2`);
  console.log('\n🔐 Default password for all users: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
