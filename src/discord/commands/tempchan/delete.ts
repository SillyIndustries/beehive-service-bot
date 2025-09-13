import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import tempChanContainer from '../../tempchan/index.js';

export const name = 'delete';

export const deleteSubcommand = (subcommand: SlashCommandSubcommandBuilder) =>
  subcommand
    .setName(name)
    .setDescription('delete a temporary channel');

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!tempChanContainer.has(interaction.user.id)) {
    await interaction.editReply('you do not have a temporary channel to delete');
    return;
  }

  tempChanContainer.delete(interaction.user.id);
  await interaction.editReply('your temporary channel has been deleted');
}