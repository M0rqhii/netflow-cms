/**
 * Shared Zod Schemas for NetFlow CMS
 * AI Note: These schemas are used for validation in both API and Frontend
 */

import { z } from 'zod';

// Tenant Schemas
export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'professional', 'enterprise']).default('free'),
  settings: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'professional', 'enterprise']).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  plan: z.enum(['free', 'professional', 'enterprise']).optional(),
  settings: z.record(z.unknown()).optional(),
});

// Content Type Schemas
// Note: Using z.lazy with explicit return type to avoid recursive type inference issues
type ContentTypeFieldType = {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'richtext' | 'media' | 'relation' | 'json' | 'object' | 'array';
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  defaultValue?: unknown;
  description?: string;
  relationType?: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  relatedContentTypeId?: string;
  fields?: ContentTypeFieldType[];
  items?: ContentTypeFieldType;
};

export const ContentTypeFieldSchema: z.ZodType<ContentTypeFieldType> = z.lazy(() => z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  type: z.enum(['text', 'number', 'boolean', 'date', 'datetime', 'richtext', 'media', 'relation', 'json', 'object', 'array']),
  required: z.boolean().default(false),
  maxLength: z.number().int().positive().optional(),
  minLength: z.number().int().nonnegative().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  defaultValue: z.unknown().optional(),
  description: z.string().max(500).optional(),
  relationType: z.enum(['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany']).optional(),
  relatedContentTypeId: z.string().uuid().optional(),
  fields: z.array(ContentTypeFieldSchema).optional(),
  items: ContentTypeFieldSchema.optional(),
}));

export const ContentTypeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  schema: z.record(z.unknown()),
  fields: z.array(ContentTypeFieldSchema).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateContentTypeSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  fields: z.array(ContentTypeFieldSchema).optional(),
  schema: z.record(z.unknown()).optional(),
});

export const UpdateContentTypeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  fields: z.array(ContentTypeFieldSchema).optional(),
  schema: z.record(z.unknown()).optional(),
});

// Content Entry Schemas
export const ContentEntrySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  contentTypeId: z.string().uuid(),
  data: z.record(z.unknown()),
  status: z.enum(['draft', 'review', 'published', 'archived']).default('draft'),
  publishedAt: z.date().nullable().optional(),
  reviewedAt: z.date().nullable().optional(),
  reviewedById: z.string().uuid().nullable().optional(),
  createdById: z.string().uuid().nullable().optional(),
  updatedById: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateContentEntrySchema = z.object({
  data: z.record(z.unknown()),
  status: z.enum(['draft', 'review', 'published', 'archived']).optional(),
});

export const UpdateContentEntrySchema = z.object({
  data: z.record(z.unknown()).optional(),
  status: z.enum(['draft', 'review', 'published', 'archived']).optional(),
});

// RBAC schemas
export const CAPABILITY_MODULES = [
  'org',
  'billing',
  'sites',
  'builder',
  'content',
  'hosting',
  'domains',
  'marketing',
  'analytics',
] as const;

export const CapabilityModuleSchema = z.enum(CAPABILITY_MODULES);
export type CapabilityModule = z.infer<typeof CapabilityModuleSchema>;

export const CAPABILITY_KEYS = [
  'org.view_dashboard',
  'org.users.view',
  'org.users.invite',
  'org.users.remove',
  'org.roles.view',
  'org.roles.manage',
  'org.policies.view',
  'org.policies.manage',
  'billing.view_plan',
  'billing.change_plan',
  'billing.view_invoices',
  'billing.manage_payment_methods',
  'sites.view',
  'sites.create',
  'sites.delete',
  'sites.settings.view',
  'sites.settings.manage',
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
  'content.view',
  'content.create',
  'content.edit',
  'content.delete',
  'content.publish',
  'content.media.manage',
  'hosting.usage.view',
  'hosting.deploy',
  'hosting.files.view',
  'hosting.files.edit',
  'hosting.logs.view',
  'hosting.backups.manage',
  'hosting.restart.manage',
  'domains.view',
  'domains.assign',
  'domains.dns.manage',
  'domains.ssl.manage',
  'domains.add_remove',
  'marketing.view',
  'marketing.content.edit',
  'marketing.schedule',
  'marketing.publish',
  'marketing.campaign.manage',
  'marketing.social.connect',
  'marketing.ads.manage',
  'marketing.stats.view',
  'analytics.view',
] as const;

export const CapabilityKeySchema = z.enum(CAPABILITY_KEYS);
export type CapabilityKey = z.infer<typeof CapabilityKeySchema>;

export const RbacCapabilitySchema = z.object({
  key: CapabilityKeySchema,
  module: CapabilityModuleSchema,
  label: z.string(),
  description: z.string().optional(),
  riskLevel: z.enum(['LOW', 'MED', 'HIGH']),
  isDangerous: z.boolean(),
  canBePolicyControlled: z.boolean().optional(),
  policyEnabled: z.boolean().optional(),
  metadata: z
    .object({
      blockedForCustomRoles: z.boolean().optional(),
    })
    .optional(),
});

export type RbacCapability = z.infer<typeof RbacCapabilitySchema>;

// Collection Schemas
export const CollectionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  schemaJson: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCollectionSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  schemaJson: z.record(z.unknown()).optional(),
});

export const UpdateCollectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  schemaJson: z.record(z.unknown()).optional(),
});

// Collection Item Schemas
export const CollectionItemSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  collectionId: z.string().uuid(),
  data: z.record(z.unknown()),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  version: z.number().int().positive().default(1),
  createdById: z.string().uuid().nullable().optional(),
  updatedById: z.string().uuid().nullable().optional(),
  publishedAt: z.date().nullable().optional(),
  etag: z.string().default(''),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCollectionItemSchema = z.object({
  data: z.record(z.unknown()),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export const UpdateCollectionItemSchema = z.object({
  data: z.record(z.unknown()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

// Media Schemas (MediaFile)
export const MediaFileSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  filename: z.string(),
  url: z.string().url(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  alt: z.string().max(500).nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  uploadedById: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateMediaFileSchema = z.object({
  filename: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  alt: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateMediaFileSchema = z.object({
  alt: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Legacy alias for backward compatibility
export const MediaItemSchema = MediaFileSchema;
export * as Permissions from './permissions';
export * from './capabilities';
export * as Media from './media';

// JSON helper for page content / builder payloads
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.lazy(() => JsonValueSchema)),
    z.record(z.lazy(() => JsonValueSchema)),
  ])
);

// Site Panel: Environments & Pages
export const EnvironmentTypeSchema = z.enum(['draft', 'production']);
export type EnvironmentType = z.infer<typeof EnvironmentTypeSchema>;

export const PageStatusSchema = z.enum(['draft', 'published', 'archived']);
export type PageStatus = z.infer<typeof PageStatusSchema>;
export type PageContent = JsonValue;

const PageSlugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:[a-z0-9-\\/]*[a-z0-9])?$/i, 'Invalid page slug');

export const SiteEnvironmentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: EnvironmentTypeSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateSiteEnvironmentSchema = z.object({
  type: EnvironmentTypeSchema,
});

export const PageSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  environmentId: z.string().uuid(),
  slug: PageSlugSchema,
  title: z.string().min(1).max(255),
  status: PageStatusSchema,
  content: JsonValueSchema.default({}),
  publishedAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePageSchema = z.object({
  environmentId: z.string().uuid(),
  slug: PageSlugSchema,
  title: z.string().min(1).max(255),
  status: PageStatusSchema.optional(),
  content: JsonValueSchema.optional(),
});

export const UpdatePageSchema = z.object({
  slug: PageSlugSchema.optional(),
  title: z.string().min(1).max(255).optional(),
  status: PageStatusSchema.optional(),
  content: JsonValueSchema.optional(),
});

export const PublishPageSchema = z.object({
  targetEnvironmentId: z.string().uuid().optional(),
  targetEnvironmentType: EnvironmentTypeSchema.optional(),
});

export const PageQuerySchema = z.object({
  environmentId: z.string().uuid().optional(),
  environmentType: EnvironmentTypeSchema.optional(),
  status: PageStatusSchema.optional(),
});

export const UpdatePageContentSchema = z.object({
  content: JsonValueSchema,
});

// Site Deployment Schemas
export const SiteDeploymentSchema = z.object({
  id: z.string(),
  siteId: z.string().uuid(),
  env: z.string(),
  type: z.string(),
  status: z.enum(['success', 'failed']),
  message: z.string().nullable().optional(),
  createdAt: z.date(),
});

export const PublishDeploymentSchema = z.object({
  pageId: z.string().uuid().optional(),
});

export const DeploymentQuerySchema = z.object({
  env: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(['success', 'failed']).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

// Site SEO settings (skeleton)
export const SeoSettingsSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  ogTitle: z.string().nullable().optional(),
  ogDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  twitterCard: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UpdateSeoSettingsDtoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  twitterCard: z.string().optional(),
});

export * as MediaSchemas from './media';

// User Schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['super_admin', 'tenant_admin', 'editor', 'viewer']).default('viewer'),
  preferredLanguage: z.enum(['pl', 'en']).default('en'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['super_admin', 'tenant_admin', 'editor', 'viewer']).optional(),
  preferredLanguage: z.enum(['pl', 'en']).optional(),
});

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['super_admin', 'tenant_admin', 'editor', 'viewer']).optional(),
  preferredLanguage: z.enum(['pl', 'en']).optional(),
});

// UserTenant Schemas (multi-tenant membership)
export const UserTenantSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(['super_admin', 'tenant_admin', 'editor', 'viewer']).default('viewer'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserTenantSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(['super_admin', 'tenant_admin', 'editor', 'viewer']).optional(),
});

export const UpdateUserTenantSchema = z.object({
  role: z.enum(['super_admin', 'tenant_admin', 'editor', 'viewer']).optional(),
});

// Webhook Schemas
export const WebhookSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  collectionId: z.string().uuid().nullable().optional(),
  url: z.string().url(),
  events: z.array(z.string()),
  secret: z.string(),
  active: z.boolean().default(true),
  description: z.string().max(500).nullable().optional(),
  retryCount: z.number().int().positive().default(3),
  timeout: z.number().int().positive().default(5000),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateWebhookSchema = z.object({
  collectionId: z.string().uuid().optional(),
  url: z.string().url(),
  events: z.array(z.string()),
  secret: z.string().optional(),
  active: z.boolean().optional(),
  description: z.string().max(500).optional(),
  retryCount: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
});

export const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  description: z.string().max(500).optional(),
  retryCount: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
});

// WebhookDelivery Schemas
export const WebhookDeliverySchema = z.object({
  id: z.string().uuid(),
  webhookId: z.string().uuid(),
  tenantId: z.string().uuid(),
  event: z.string(),
  status: z.enum(['success', 'failed', 'pending']),
  statusCode: z.number().int().positive().nullable().optional(),
  response: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  attempt: z.number().int().positive().default(1),
  deliveredAt: z.date().nullable().optional(),
  createdAt: z.date(),
});

// Content Review Schemas
export const ContentReviewSchema = z.object({
  id: z.string().uuid(),
  contentEntryId: z.string().uuid(),
  tenantId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  status: z.enum(['approved', 'rejected', 'changes_requested']),
  comment: z.string().max(5000).nullable().optional(),
  createdAt: z.date(),
});

export const CreateContentReviewSchema = z.object({
  status: z.enum(['approved', 'rejected', 'changes_requested']),
  comment: z.string().max(5000).optional(),
});

// Content Comment Schemas
export const ContentCommentSchema = z.object({
  id: z.string().uuid(),
  contentEntryId: z.string().uuid(),
  tenantId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  resolved: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateContentCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const UpdateContentCommentSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  resolved: z.boolean().optional(),
});

// Task Schemas
export const TaskSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  contentEntryId: z.string().uuid().nullable().optional(),
  collectionItemId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assignedToId: z.string().uuid().nullable().optional(),
  createdById: z.string().uuid(),
  dueDate: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTaskSchema = z.object({
  contentEntryId: z.string().uuid().optional(),
  collectionItemId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().uuid().optional(),
  dueDate: z.date().optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().uuid().optional(),
  dueDate: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
});

// CollectionRole Schemas
export const CollectionRoleSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  collectionId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['viewer', 'editor', 'admin']).default('viewer'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCollectionRoleSchema = z.object({
  collectionId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['viewer', 'editor', 'admin']).optional(),
});

export const UpdateCollectionRoleSchema = z.object({
  role: z.enum(['viewer', 'editor', 'admin']).optional(),
});

// Plan and Billing Schemas
// Note: Infinity is represented as -1 in the database, but validated as number in Zod
export const PlanLimitsSchema = z.object({
  collections: z.number().int(),
  contentTypes: z.number().int(),
  mediaFiles: z.number().int(),
  storageMB: z.number().int(),
  users: z.number().int(),
  webhooks: z.number().int(),
  apiRequestsPerMonth: z.number().int(),
});

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  plan: z.enum(['free', 'professional', 'enterprise']),
  status: z.enum(['active', 'cancelled', 'past_due', 'trialing']).default('active'),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean().default(false),
  cancelledAt: z.date().nullable().optional(),
  trialStart: z.date().nullable().optional(),
  trialEnd: z.date().nullable().optional(),
  stripeSubscriptionId: z.string().nullable().optional(),
  stripeCustomerId: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateSubscriptionSchema = z.object({
  plan: z.enum(['free', 'professional', 'enterprise']),
  stripeCustomerId: z.string().optional(),
});

export const UpdateSubscriptionSchema = z.object({
  plan: z.enum(['free', 'professional', 'enterprise']).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  subscriptionId: z.string().uuid().nullable().optional(),
  amount: z.number().nonnegative().multipleOf(0.01), // Decimal(10,2) - 2 decimal places
  currency: z.string().length(3).default('USD'),
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']).default('draft'),
  dueDate: z.date().nullable().optional(),
  paidAt: z.date().nullable().optional(),
  stripeInvoiceId: z.string().nullable().optional(),
  invoiceNumber: z.string(),
  lineItems: z.array(z.record(z.unknown())).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateInvoiceSchema = z.object({
  subscriptionId: z.string().uuid().optional(),
  amount: z.number().nonnegative().multipleOf(0.01),
  currency: z.string().length(3).optional(),
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']).optional(),
  dueDate: z.date().optional(),
  lineItems: z.array(z.record(z.unknown())).optional(),
});

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  invoiceId: z.string().uuid().nullable().optional(),
  amount: z.number().nonnegative().multipleOf(0.01), // Decimal(10,2) - 2 decimal places
  currency: z.string().length(3).default('USD'),
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded']).default('pending'),
  paymentMethod: z.string(),
  stripePaymentIntentId: z.string().nullable().optional(),
  paidAt: z.date().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePaymentSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  amount: z.number().nonnegative().multipleOf(0.01),
  currency: z.string().length(3).optional(),
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded']).optional(),
  paymentMethod: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const UsageTrackingSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  resourceType: z.enum(['collections', 'contentTypes', 'mediaFiles', 'users', 'storageMB', 'apiRequests']),
  count: z.number().int().nonnegative(),
  period: z.string(), // Format: YYYY-MM
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUsageTrackingSchema = z.object({
  resourceType: z.enum(['collections', 'contentTypes', 'mediaFiles', 'users', 'storageMB', 'apiRequests']),
  count: z.number().int().nonnegative(),
  period: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

// Page Builder: Block System Schemas
// Foundation for flexible block-based page building
// Block type definition (used by schema)
export type Block = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: Block[];
  meta?: {
    className?: string;
    style?: Record<string, string>;
    responsive?: Record<
      string,
      {
        className?: string;
        style?: Record<string, string>;
      }
    >;
  };
};

// Input type for BlockSchema (allows props to be optional)
type BlockInput = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: BlockInput[];
  meta?: {
    className?: string;
    style?: Record<string, string>;
    responsive?: Record<
      string,
      {
        className?: string;
        style?: Record<string, string>;
      }
    >;
  };
};

export const BlockSchema: z.ZodType<Block, z.ZodTypeDef, BlockInput> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    props: z.record(z.unknown()).default({}),
    children: z.array(z.lazy(() => BlockSchema)).optional(),
    meta: z
      .object({
        className: z.string().optional(),
        style: z.record(z.string()).optional(),
        responsive: z
          .record(
            z.object({
              className: z.string().optional(),
              style: z.record(z.string()).optional(),
            })
          )
          .optional(),
      })
      .optional(),
  })
);

export const BlockTreeSchema = z.object({
  blocks: z.array(BlockSchema).default([]),
  version: z.string().optional(),
});

export type BlockTree = z.infer<typeof BlockTreeSchema>;

// Export types
export type Tenant = z.infer<typeof TenantSchema>;
export type CreateTenant = z.infer<typeof CreateTenantSchema>;
export type UpdateTenant = z.infer<typeof UpdateTenantSchema>;
export type ContentType = z.infer<typeof ContentTypeSchema>;
export type CreateContentType = z.infer<typeof CreateContentTypeSchema>;
export type UpdateContentType = z.infer<typeof UpdateContentTypeSchema>;
export type ContentEntry = z.infer<typeof ContentEntrySchema>;
export type CreateContentEntry = z.infer<typeof CreateContentEntrySchema>;
export type UpdateContentEntry = z.infer<typeof UpdateContentEntrySchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type CreateCollection = z.infer<typeof CreateCollectionSchema>;
export type UpdateCollection = z.infer<typeof UpdateCollectionSchema>;
export type CollectionItem = z.infer<typeof CollectionItemSchema>;
export type CreateCollectionItem = z.infer<typeof CreateCollectionItemSchema>;
export type UpdateCollectionItem = z.infer<typeof UpdateCollectionItemSchema>;
export type MediaFile = z.infer<typeof MediaFileSchema>;
export type CreateMediaFile = z.infer<typeof CreateMediaFileSchema>;
export type UpdateMediaFile = z.infer<typeof UpdateMediaFileSchema>;
export type MediaItem = z.infer<typeof MediaItemSchema>; // Legacy alias
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserTenant = z.infer<typeof UserTenantSchema>;
export type CreateUserTenant = z.infer<typeof CreateUserTenantSchema>;
export type UpdateUserTenant = z.infer<typeof UpdateUserTenantSchema>;
export type Webhook = z.infer<typeof WebhookSchema>;
export type CreateWebhook = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhook = z.infer<typeof UpdateWebhookSchema>;
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;
export type ContentReview = z.infer<typeof ContentReviewSchema>;
export type CreateContentReview = z.infer<typeof CreateContentReviewSchema>;
export type ContentComment = z.infer<typeof ContentCommentSchema>;
export type CreateContentComment = z.infer<typeof CreateContentCommentSchema>;
export type UpdateContentComment = z.infer<typeof UpdateContentCommentSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type CollectionRole = z.infer<typeof CollectionRoleSchema>;
export type CreateCollectionRole = z.infer<typeof CreateCollectionRoleSchema>;
export type UpdateCollectionRole = z.infer<typeof UpdateCollectionRoleSchema>;
export type PlanLimits = z.infer<typeof PlanLimitsSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type CreateSubscription = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscription = z.infer<typeof UpdateSubscriptionSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type CreatePayment = z.infer<typeof CreatePaymentSchema>;
export type UsageTracking = z.infer<typeof UsageTrackingSchema>;
export type CreateUsageTracking = z.infer<typeof CreateUsageTrackingSchema>;
// Block and BlockTree types are already defined above, no need to re-export inferred types// Export permissions
export * from './permissions';// Export feature flags
export * from './feature-flags';
// Snapshots & Site Events
export * from './snapshots';
export * from './site-events';