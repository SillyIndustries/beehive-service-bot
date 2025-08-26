import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import * as lnkrole from '../../discord/lnkrole/main.js';
import { redis, VERIFICATION_HASH_KEY_PREFIX, VERIFICATION_TTL } from '../../redis/index.js';
import { client } from '../../discord/client.js';
import { env } from '../../env.js';

function getStart(_: FastifyRequest, res: FastifyReply) {
  const { state, url } = lnkrole.getOAuthUrl();

  return res
    .setCookie('clientState', state, {
      maxAge: 1000 * 60 * 5,
      signed: true,
      httpOnly: true,
      path: '/',
    })
    .redirect(url);
}

interface ContinueQueryType {
  code: string;
  state: string;
}

async function getContinue(req: FastifyRequest<{ Querystring: ContinueQueryType }>, res: FastifyReply) {
  const discordState = req.query['state'];

  try {
    const code = req.query['code'];

    if (!req.cookies['clientState'])
      return res.status(403).send('No client state cookie.');

    const { valid, value } = req.unsignCookie(req.cookies['clientState']);
    if (!valid || value !== discordState)
      return res.status(403).send('State verification failed.');

    const tokens = await lnkrole.getOAuthTokens(code);
    const meData = await lnkrole.getUserData(tokens);

    const userId = meData.user.id;
    const guild = await client.guilds.fetch(env.DISCORD_GUILD)
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member)
      return res.status(403).send('No.\n\nSent from my iPhone.');

    await redis.hSet(VERIFICATION_HASH_KEY_PREFIX + discordState, {
      discord_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: (Date.now() / 1000 | 0) + tokens.expires_in,
    });
    await redis.expire(VERIFICATION_HASH_KEY_PREFIX + discordState, VERIFICATION_TTL);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Something went wrong!');
  }

  return res.redirect('https://t.me/beelineuabot?start=' + discordState);
}

export default function tg(fastify: FastifyInstance) {
  fastify.get('/tg/start', getStart);
  fastify.get('/tg/continue', getContinue);
}