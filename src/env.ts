import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const r = z.object({
  API_ID: z.coerce.number(),
  API_HASH: z.string(),
  BOT_TOKEN: z.string(),
  DISCORD_TOKEN: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  DISCORD_GUILD: z.string(),
  DISCORD_WORKER_ROLE: z.string(),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  PORT: z.coerce.number().default(6498),
  COOKIE_SECRET: z.string(),
  TELEGRAM_SELF_CHANNEL: z.string(),
  DISCORD_REDIRECT_URI: z.httpUrl(),
}).safeParse(process.env)

if (!r.success)
  throw new Error('Invalid env:\n' + z.prettifyError(r.error))

export const env = r.data
