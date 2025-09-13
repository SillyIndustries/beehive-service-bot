import { AuditLogEvent, ChannelType, VoiceChannel, VoiceState } from 'discord.js';
import EventEmitter from 'events';

import { env } from '../../env.js';
import { client } from '../client.js';
import {
  redis,
  subscribeForExpiryEvents,
  TEMP_CHAN_EXPIRY,
  TEMP_CHAN_KEY_PREFIX
} from '../../redis/index.js';
import { wait } from '../../utils/wait.js';

export interface RedisTempChanCacheValue {
  name: string;
  isPrivate: boolean;
  initiatorId: string;
  channelId: string;
}

export default class TempChanInstance extends EventEmitter {
  public allowedUsers: string[] = [];
  public grace = false;

  constructor(
    public name: string,
    public isPrivate: boolean,
    public initiatorId: string,
    public channel: VoiceChannel,
    recover = false
  ) {
    super();

    subscribeForExpiryEvents(TEMP_CHAN_KEY_PREFIX + this.initiatorId, () =>
      this.emit('delete')
    );

    if (recover)
      this.recover();
  }

  public async recover() {
    const allowed = await redis.sMembers(TEMP_CHAN_KEY_PREFIX + this.initiatorId + ':allowed');
    this.allowedUsers = allowed || [];

    if (this.channel.members.size === 0) {
      await redis.expire(TEMP_CHAN_KEY_PREFIX + this.initiatorId, TEMP_CHAN_EXPIRY);
      this.grace = true;
    }
  }

  public async voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    if (newState.member?.user.bot) return;

    if (newState.channelId === this.channel.id) { // joined
      if (this.grace) {
        console.log('cancelling grace period');
        this.grace = false;
        await redis.persist(TEMP_CHAN_KEY_PREFIX + this.initiatorId);
      }

      if (this.isPrivate) {
        await wait(2500); // wait for audit log to populate (probably will never work)
        const audit = await this.channel.guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MemberMove
        });

        const entry = audit.entries.first();
        const memberId = newState.member?.id || '';

        if (entry && entry.target?.id === memberId) {
          const executor = entry.executor;
          if (executor && executor.id !== memberId && executor.id === this.initiatorId)
            await this.allowUser(memberId);
        } else if (memberId !== this.initiatorId && !this.allowedUsers.includes(memberId)) {
          newState.setChannel(oldState.channel, 'temporary voice channel is private');
          this.channel.send('<@' + memberId + '> tried to join private temporary channel without permission');
        }
      }
    }

    if (oldState.channelId === this.channel.id) { // left
      if (this.channel.members.size === 0) {
        console.log('starting grace period');
        await redis.expire(TEMP_CHAN_KEY_PREFIX + this.initiatorId, TEMP_CHAN_EXPIRY);
        this.grace = true;
      }
    }
  }

  public async allowUser(userId: string) {
    if (!this.allowedUsers.includes(userId)) {
      await redis.sAdd(TEMP_CHAN_KEY_PREFIX + this.initiatorId + ':allowed', userId);
      this.allowedUsers.push(userId);
    }
  }

  public async disallowUser(userId: string) {
    if (this.allowedUsers.includes(userId)) {
      await redis.sRem(TEMP_CHAN_KEY_PREFIX + this.initiatorId + ':allowed', userId);
      this.allowedUsers = this.allowedUsers.filter(u => u !== userId);
    }
  }

  public static async initiate(name: string, isPrivate: boolean, initiatorId: string) {
    const guild = await client.guilds.fetch(env.DISCORD_GUILD);
    if (!guild) throw new Error('Guild not found');

    const channel = await guild.channels.create({
      name: (isPrivate ? '🔒' : '') + '💣 ' + name,
      type: ChannelType.GuildVoice,
      reason: `temporary voice channel created by user ${initiatorId}`,
    });

    const instance = new TempChanInstance(name, isPrivate, initiatorId, channel);
    await redis.hSet(TEMP_CHAN_KEY_PREFIX + initiatorId, {
      name,
      isPrivate: isPrivate.toString(),
      initiatorId,
      channelId: channel.id,
    });

    // mark grace period instantly
    await redis.expire(TEMP_CHAN_KEY_PREFIX + initiatorId, TEMP_CHAN_EXPIRY);
    instance.grace = true;

    return instance;
  }

  public static async initiateFromCached(data: RedisTempChanCacheValue) {
    const guild = await client.guilds.fetch(env.DISCORD_GUILD);
    if (!guild) throw new Error('Guild not found');

    const channel = await guild.channels.fetch(data.channelId) as VoiceChannel;
    if (!channel) throw new Error('Channel not found');

    return new TempChanInstance(data.name, data.isPrivate, data.initiatorId, channel);
  }
}