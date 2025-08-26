import { createClient } from 'redis';
import { env } from '../env.js';

export const redis = await createClient({
  url: env.REDIS_URL,
  RESP: 3,
  clientSideCache: {
    ttl: 0,
    maxEntries: 0,
  }
})
  .on('error', (err) =>
    console.log('Redis Client Error', err)
  )
  .connect();

export const VERIFICATION_HASH_KEY_PREFIX = 'verify:';
export const VERIFICATION_TTL = 5 * 60;