import { z } from 'zod';

/**
 * CreateChannelConnectionDto - DTO dla tworzenia połączenia z kanałem
 */
export const CreateChannelConnectionDtoSchema = z.object({
  siteId: z.string().uuid(),
  channel: z.enum(['facebook', 'twitter', 'linkedin', 'instagram', 'ads']),
  channelId: z.string().optional(),
  channelName: z.string().optional(),
  credentials: z.record(z.any()).default({}), // Stub - w produkcji użyj vault
  metadata: z.record(z.any()).default({}),
});

export type CreateChannelConnectionDto = z.infer<typeof CreateChannelConnectionDtoSchema>;

/**
 * UpdateChannelConnectionDto - DTO dla aktualizacji połączenia
 */
export const UpdateChannelConnectionDtoSchema = z.object({
  channelId: z.string().optional(),
  channelName: z.string().optional(),
  status: z.enum(['connected', 'disconnected', 'error']).optional(),
  credentials: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateChannelConnectionDto = z.infer<typeof UpdateChannelConnectionDtoSchema>;

/**
 * ChannelConnectionQueryDto - DTO dla query parametrów połączeń
 */
export const ChannelConnectionQueryDtoSchema = z.object({
  siteId: z.string().uuid().optional(),
  channel: z.enum(['facebook', 'twitter', 'linkedin', 'instagram', 'ads']).optional(),
  status: z.enum(['connected', 'disconnected', 'error']).optional(),
});

export type ChannelConnectionQueryDto = z.infer<typeof ChannelConnectionQueryDtoSchema>;

