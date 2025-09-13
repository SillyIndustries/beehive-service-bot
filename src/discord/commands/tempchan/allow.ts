import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import tempChanContainer from '../../tempchan/index.js';

export const name = 'allow';

export const allowSubcommand = (subcommand: SlashCommandSubcommandBuilder) =>
  subcommand
    .setName(name)
    .setDescription('allow user to join your private temporary channel')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('the user to allow')
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
    await interaction.editReply('you cannot allow yourself');
    return;
  }

  if (interaction.user.id !== instance.initiatorId) {
    await interaction.editReply('only the channel creator can allow users');
    return;
  }

  await instance.allowUser(user.id);
  await interaction.editReply('allowed <@' + user.id + '> to join your temporary channel');
}