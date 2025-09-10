import { Client, Message } from 'discord.js';

import { tokenizeMessage, trainOnMessage } from './training.js';
import { env } from '../../env.js';
import { MAX_WORDS, ORDER } from './constants.js';
import { generateMessage, getStartingPointFromString } from './generation.js';

function sanitizeMessage(content: string) {
  return content
    .replace(/https?:\/\/\S+/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/(\*\*|__|\*|_)/g, '')
    .replace(/\|\|/g, '')
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const THRESHOLD = 0.7;
function isMostlySymbols(str: string) {
  if (!str.length) return false;
  const symbols = str.replace(/[A-Za-zА-Яа-я0-9\s]/gi, '');
  return symbols.length / str.length > THRESHOLD;
}

function shouldTrainOnMessage(message: string) {
  if (isMostlySymbols(message)) return false;

  const tokens = tokenizeMessage(message, ORDER);
  return tokens.length > ORDER * 2;
}

const wait = (min: number, max: number) =>
  new Promise(r => setTimeout(r, min + Math.floor(Math.random() * (max - min))));

const CHANCE_OF_USING_STARTING_POINT = 0.55;
const WAIT_PER_CHAR = 5;
const MAX_PAD_MULTIPLIER = 1.3;
async function doShitposting(message: Message, sanitized: string, shouldUseSanitized = true) {
  if (!message.channel.isSendable()) return;

  let point = ((Math.random() < CHANCE_OF_USING_STARTING_POINT) && shouldUseSanitized) ?
    await getStartingPointFromString(sanitized) :
    null;

  console.log('Generating message', { point });

  const sentences = await generateMessage(MAX_WORDS, 1 + Math.floor(Math.random() * 2), point);
  for (let i = 0; i < sentences.length; i++) {
    await wait(1000, 4000);

    const sentence = sentences[i];

    const times = 1 + Math.floor(Math.random() * 3);
    for (let _ = 0; _ < times; _++) {
      await message.channel.sendTyping();

      const pad = WAIT_PER_CHAR * sentence.length;
      await wait(2000 + pad, 4000 + pad * MAX_PAD_MULTIPLIER);
    }

    await message.channel.send({
      content: sentence,
      reply: i === 0 ? {
        messageReference: message
      }  : undefined,
      allowedMentions: { parse: [] }
    });
  }
}

const CHANCE_OF_REPLY = 0.15;
const INC_CHANCE_PER_MINUTE = 0.05;
const MAX_MINUTES = (1 - CHANCE_OF_REPLY) / INC_CHANCE_PER_MINUTE - 5;
const MENTION_BONUS = 0.3;

let lastMessagePostedTime = 0;
async function onMessageCreate(message: Message, answer = true) {
  if (message.author.bot) return;
  if (!message.content) return;
  if (!message.guild || message.guildId !== env.DISCORD_GUILD) return;

  const sanitized = sanitizeMessage(message.content);
  const shouldUseSanitized = shouldTrainOnMessage(sanitized);

  let chanceOfReply = CHANCE_OF_REPLY;
  if (lastMessagePostedTime) {
    const minutes = Math.min(MAX_MINUTES, (Date.now() - lastMessagePostedTime) / 60000);
    chanceOfReply += minutes * INC_CHANCE_PER_MINUTE;
  }

  if (message.mentions.has(message.client.user!, { ignoreEveryone: true }))
    chanceOfReply += MENTION_BONUS;

  const rng = Math.random();
  if (rng < chanceOfReply && answer)
    await doShitposting(message, sanitized, shouldUseSanitized).catch(console.error);

  if (shouldUseSanitized)
    await trainOnMessage(sanitized).catch(console.error);

  lastMessagePostedTime = Date.now();
}

export function hookMarkov(client: Client) {
  client.on('messageCreate', onMessageCreate);
}

const IGNORE_CHANNELS = [ '1340741015719379024', '1400575094400614573', '1352003021785141248' ];
export async function learnOnEveryMessageOnServer(client: Client) {
  const guilds = await client.guilds.fetch(env.DISCORD_GUILD);
  const channels = await guilds.channels.fetch();

  for (const [_, channel] of channels) {
    if (!channel) continue;
    if (!channel.isTextBased()) continue;
    if (!channel.viewable) continue;
    if (IGNORE_CHANNELS.includes(channel.id)) continue;

    console.log('Learning on channel', channel.id, channel.name);

    let before: string | undefined;
    while (true) {
      const messages = await channel.messages.fetch({ limit: 100, before });
      if (!messages.size) break;

      for (const [_, message] of messages) {
        console.log('>', message.id, message.content.slice(0, 30));
        await onMessageCreate(message, false);
        before = message.id;
      }

      await wait(1000, 1000);
    }
  }
}