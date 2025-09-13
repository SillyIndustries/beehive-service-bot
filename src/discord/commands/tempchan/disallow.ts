import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import tempChanContainer from '../../tempchan/index.js';

export const name = 'disallow';

export const disallowSubcommand = (subcommand: SlashCommandSubcommandBuilder) =>
  subcommand
    .setName(name)
    .setDescription('disallow user to join your private temporary channel')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('the user to disallow')
        .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const instance = tempChanContainer.get(interaction.user.id);
  if (!instance) {
    await interaction.editReply('you do not have a temporary channel');
    return;
  }

  if (!instance.isPrivate) {
    await interaction.editReply('your temporary channel is not private');
    return;
  }

  const user = interaction.options.getUser('user', true);
  if (user.id === interaction.user.id) {
    await interaction.editReply('you cannot disallow yourself');
    return;
  }

  if (interaction.user.id !== instance.initiatorId) {
    await interaction.editReply('only the channel creator can disallow users');
    return;
  }

  await instance.disallowUser(user.id);
  await interaction.editReply('disallowed <@' + user.id + '> to join your temporary channel');
}