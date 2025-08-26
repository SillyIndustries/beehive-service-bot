import { ApplicationRoleConnectionMetadataType } from 'discord.js';

import { client } from './client.js';
import { registerCommands } from './commands.js';
import { env } from '../env.js';

import * as lnkrole from './lnkrole/main.js';

await client.login(env.DISCORD_TOKEN);
await registerCommands(client);

await client.application?.editRoleConnectionMetadataRecords([
  {
    type: ApplicationRoleConnectionMetadataType.IntegerGreaterThanOrEqual,
    name: 'Subscribers',
    description: 'Telegram channel subscribers',
    key: 'subs'
  }
]);

await client.on('guildMemberRemove', async (member) => {
  if (member.guild.id !== env.DISCORD_GUILD) return;

  await lnkrole.removeAllAssociationsForDiscord(member.id);
});