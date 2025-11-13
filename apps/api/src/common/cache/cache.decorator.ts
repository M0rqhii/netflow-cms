import { SetMetadata } from '@nestjs/common';

/**
 * Cache decorator - marks methods for caching
 * AI Note: Use this decorator to cache method results
 * 
 * @param ttl - Time to live in seconds (default: 300)
 * @param key - Custom cache key (optional, defaults to method name + params)
 */
export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';

export const Cache = (ttl: number = 300, key?: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_TTL, ttl)(target, propertyKey, descriptor);
    if (key) {
      SetMetadata(CACHE_KEY, key)(target, propertyKey, descriptor);
    }
  };
};

