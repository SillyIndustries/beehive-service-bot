import { Client } from 'discord.js';
import { collection } from './commands.js';

export const client = new Client({
  intents: [
    'Guilds',
    'GuildMessages',
    'MessageContent',
    'GuildMessageReactions',
    'GuildMembers',
  ],
});

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = collection.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'There was an error while executing this command.', ephemeral: true });
  }
});