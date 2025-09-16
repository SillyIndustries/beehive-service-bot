import { GuildMember, PartialGuildMember } from 'discord.js';
import { env } from '../env.js';
import { PUNISH_KEY_PREFIX, redis, subscribeForExpiryEvents } from '../redis/index.js';
import { client } from './client.js';

subscribeForExpiryEvents(PUNISH_KEY_PREFIX, async (message) => {
  const userId = message.slice(PUNISH_KEY_PREFIX.length);

  try {
    const guild = await client.guilds.fetch(env.DISCORD_GUILD);
    if (!guild) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    if (member.isCommunicationDisabled()) {
      await member.timeout(null, 'punishment expired');
      console.log(`removed timeout for user ${member.user.tag} (${member.id})`);
    }
  } catch (err) {
    console.error('error handling punishment expiry', err);
  }
});

export async function punishUser(userId: string, durationMs: number) {
  const guild = await client.guilds.fetch(env.DISCORD_GUILD);
  if (!guild) throw new Error('guild not found');

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) throw new Error('member not found');

  const workerRole = guild.roles.cache.get(env.DISCORD_WORKER_ROLE);
  if (workerRole && member.roles.cache.has(workerRole.id)) {
    await member.roles.remove(workerRole, 'punishment applied');
    console.log(`removed worker role from user ${member.user.tag} (${member.id}) for ${durationMs}ms`);
  }

  const key = PUNISH_KEY_PREFIX + userId;
  await redis.set(key, '1', { expiration: { type: 'EX', value: durationMs } });
}

export async function isUserPunished(userId: string) {
  const key = PUNISH_KEY_PREFIX + userId;
  const exists = await redis.exists(key);
  return exists === 1;
}

export async function getPunishmentTTL(userId: string) {
  const key = PUNISH_KEY_PREFIX + userId;
  const ttl = await redis.pTTL(key);
  return ttl;
}

export async function liftPunishment(userId: string) {
  const key = PUNISH_KEY_PREFIX + userId;
  await redis.del(key);
}

// if a member tried to give someone the worker role while punished, remove it
async function guildMemberUpdate(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
  if (oldMember.roles.cache.size < newMember.roles.cache.size) {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const workerRole = await newMember.guild.roles.fetch(env.DISCORD_WORKER_ROLE);

    if (!workerRole || !addedRoles.has(workerRole.id)) return;

    const punished = await isUserPunished(newMember.id);
    if (punished) {
      await newMember.roles.remove(workerRole, 'user is currently punished');
      console.log(`removed worker role from user ${newMember.user.tag} (${newMember.id}) who is currently punished`);
    }
  }
}

client.on('clientReady', () =>
  client.on('guildMemberUpdate', guildMemberUpdate)
);