import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('echo')
  .setDescription('Replies with the same message you send.')
  .addStringOption(option =>
    option.setName('message')
      .setDescription('The message to echo back')
      .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const message = interaction.options.getString('message');
  if (!message)
    return interaction.reply({ content: 'No message provided to echo.', ephemeral: true });
  await interaction.reply(message);
}