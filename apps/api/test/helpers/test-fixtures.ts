import { Role } from '../../src/common/auth/roles.enum';

/**
 * Test data fixtures for consistent test data across test suites
 */
export const TestFixtures = {
  tenants: {
    free: {
      name: 'Free Plan Tenant',
      slug: 'free-tenant',
      plan: 'free',
    },
    pro: {
      name: 'Pro Plan Tenant',
      slug: 'pro-tenant',
      plan: 'pro',
    },
    enterprise: {
      name: 'Enterprise Plan Tenant',
      slug: 'enterprise-tenant',
      plan: 'enterprise',
    },
  },

  users: {
    superAdmin: {
      email: 'superadmin@test.com',
      role: Role.SUPER_ADMIN,
      password: 'SuperAdmin123!',
    },
    tenantAdmin: {
      email: 'admin@test.com',
      role: Role.TENANT_ADMIN,
      password: 'Admin123!',
    },
    editor: {
      email: 'editor@test.com',
      role: Role.EDITOR,
      password: 'Editor123!',
    },
    viewer: {
      email: 'viewer@test.com',
      role: Role.VIEWER,
      password: 'Viewer123!',
    },
  },

  collections: {
    basic: {
      slug: 'test-collection',
      name: 'Test Collection',
      schemaJson: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['title'],
      },
    },
    complex: {
      slug: 'complex-collection',
      name: 'Complex Collection',
      schemaJson: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          metadata: {
            type: 'object',
            properties: {
              author: { type: 'string' },
              published: { type: 'boolean' },
            },
          },
        },
        required: ['title'],
      },
    },
  },

  contentTypes: {
    basic: {
      slug: 'test-content-type',
      name: 'Test Content Type',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['title'],
      },
    },
    article: {
      slug: 'article',
      name: 'Article',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          author: { type: 'string' },
          publishedAt: { type: 'string', format: 'date-time' },
        },
        required: ['title', 'content'],
      },
    },
  },

  contentEntries: {
    basic: {
      data: {
        title: 'Test Entry',
        description: 'This is a test entry',
      },
      published: false,
    },
    published: {
      data: {
        title: 'Published Entry',
        description: 'This entry is published',
      },
      published: true,
    },
  },
};


