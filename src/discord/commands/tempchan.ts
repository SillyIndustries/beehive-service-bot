import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import * as allow from './tempchan/allow.js';
import * as create from './tempchan/create.js';
import * as delet from './tempchan/delete.js';
import * as disallow from './tempchan/disallow.js';

export const data = new SlashCommandBuilder()
  .setName('tempchan')
  .setDescription('tempchan commands')
  .addSubcommand(allow.allowSubcommand)
  .addSubcommand(create.createSubcommand)
  .addSubcommand(delet.deleteSubcommand)
  .addSubcommand(disallow.disallowSubcommand);

export async function execute(interaction: ChatInputCommandInteraction) {
  switch (interaction.options.getSubcommand()) {
    case allow.name:
      await allow.execute(interaction);
      break;
    case create.name:
      await create.execute(interaction);
      break;
    case delet.name:
      await delet.execute(interaction);
      break;
    case disallow.name:
      await disallow.execute(interaction);
      break;
  }
}