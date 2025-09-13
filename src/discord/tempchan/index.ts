import { Channel, VoiceState } from 'discord.js';

import { client } from '../client.js';
import TempChanInstance from './instance.js';
import { redis, TEMP_CHAN_KEY_PREFIX } from '../../redis/index.js';

export class TempChanContainer extends Map<string, TempChanInstance> {
  private mapByChannel = new Map<string, TempChanInstance>();

  constructor() {
    super();
    this.voiceStateUpdate = this.voiceStateUpdate.bind(this);
    this.channelDelete = this.channelDelete.bind(this);
  }

  public async create(name: string, isPrivate: boolean, initiatorId: string) {
    const instance = await TempChanInstance.initiate(name, isPrivate, initiatorId);
    instance.on('delete', () => this.delete(initiatorId));

    await redis.sAdd(TEMP_CHAN_KEY_PREFIX, initiatorId);

    this.set(initiatorId, instance);
    this.mapByChannel.set(instance.channel.id, instance);

    return instance;
  }

  private async voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const instance = this.mapByChannel.get(oldState.channelId ?? '');
    if (instance)
      await instance.voiceStateUpdate(oldState, newState);

    const instance2 = this.mapByChannel.get(newState.channelId ?? '');
    if (instance2 && instance !== instance2)
      await instance2.voiceStateUpdate(oldState, newState);
  }

  public delete(key: string): boolean {
    const instance = this.get(key);

    if (instance) {
      (async () => {
        try {
          const user = client.users.cache.get(instance.initiatorId);
          if (user && instance.grace)
            await user.send('your temporary voice channel has expired and been deleted');
        } catch (err) {}

        await instance.channel.delete('temporary voice channel expired/deleted');

        // remove from redis
        redis.sRem(TEMP_CHAN_KEY_PREFIX, key);
        redis.del(TEMP_CHAN_KEY_PREFIX + key);
        redis.del(TEMP_CHAN_KEY_PREFIX + key + ':allowed');
      })();

      this.mapByChannel.delete(instance.channel.id);
      super.delete(key);

      return true;
    }

    return false;
  }

  public channelDelete(channel: Channel) {
    const instance = this.mapByChannel.get(channel.id);
    if (instance)
      this.delete(instance.initiatorId);
  }

  public async ready() {
    client.on('channelDelete', this.channelDelete);
    client.on('voiceStateUpdate', this.voiceStateUpdate);

    const set = await redis.sMembers(TEMP_CHAN_KEY_PREFIX);
    for (const key of set) {
      const data = await redis.hGetAll(TEMP_CHAN_KEY_PREFIX + key);
      const instance = await TempChanInstance.initiateFromCached({
        name: data.name,
        isPrivate: data.isPrivate === 'true',
        initiatorId: data.initiatorId,
        channelId: data.channelId,
      });

      this.set(key, instance);
      this.mapByChannel.set(instance.channel.id, instance);
    }

    console.log(`Recovered ${this.size} temporary channels from Redis.`);
  }
}

const tempChanContainer = new TempChanContainer();
export default tempChanContainer;

client.on('clientReady', () => tempChanContainer.ready());