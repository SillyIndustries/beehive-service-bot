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

await redis.configSet('notify-keyspace-events', 'Ex');

export const VERIFICATION_HASH_KEY_PREFIX = 'verify:';
export const VERIFICATION_TTL = 5 * 60;

export const TEMP_CHAN_KEY_PREFIX = 'tchan:';
export const TEMP_CHAN_EXPIRY = 30;

export const PUNISH_KEY_PREFIX = 'punish:';

const events = new Map<string, ((message: string, channel: string) => void)[]>();
export function subscribeForExpiryEvents(pattern: string, listener: (message: string, channel: string) => void) {
  if (!events.has(pattern))
    events.set(pattern, []);

  events.get(pattern)?.push(listener);
}

redis.pSubscribe(`__keyevent@1__:expired`, (message, channel) => {
  console.log('[R] expired key', message, channel);
  for (const [ pattern, listeners ] of events)
    if (message.startsWith(pattern))
      for (const listener of listeners)
        listener(message, channel);
});