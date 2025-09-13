import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import tempChanContainer from '../../tempchan/index.js';

export const name = 'create';

export const createSubcommand = (subcommand: SlashCommandSubcommandBuilder) =>
  subcommand
    .setName(name)
    .setDescription('create a temporary channel')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('the name of the party')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('private')
        .setDescription('whether the channel should be private')
        .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  if (tempChanContainer.get(interaction.user.id)) {
    await interaction.editReply('you already have a temporary channel');
    return;
  }

  const instance = await tempChanContainer.create(
    interaction.options.getString('name', true),
    interaction.options.getBoolean('private') ?? false,
    interaction.user.id
  );

  await interaction.editReply('temporary channel created! <#' + instance.channel.id + '>');
}