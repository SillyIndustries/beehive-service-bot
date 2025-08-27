import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { MAX_WORDS } from '../markov/constants.js';
import { generateMessage } from '../markov/generation.js';

const CLAMP = 200;
const MIN = 10;

export const data = new SlashCommandBuilder()
  .setName('markov')
  .setDescription('Generate Markov text based on learned messages.')
  .addIntegerOption(option =>
    option.setName('max_words')
      .setDescription(`Max words (gets clamped to ${CLAMP})`)
      .setRequired(false))

export async function execute(interaction: ChatInputCommandInteraction) {
  const maxWords = interaction.options.getInteger('max_words') ?? MAX_WORDS;
  const sentence = await generateMessage(Math.max(MIN, Math.min(Math.abs(maxWords), CLAMP)));
  await interaction.reply({ content: sentence.join('\n'), allowedMentions: { parse: [] } });
}