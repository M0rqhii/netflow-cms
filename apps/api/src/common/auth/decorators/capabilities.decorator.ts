import { SetMetadata } from '@nestjs/common';

export const CAPABILITY_KEY = 'capabilities';

/**
 * Capabilities decorator - wymaga podanych capabilities
 * 
 * @example
 * @Capabilities('marketing.publish', 'marketing.ads.manage')
 */
export const Capabilities = (...capabilities: string[]) =>
  SetMetadata(CAPABILITY_KEY, capabilities);

