import { Client, Collection, Routes } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

interface Command {
  data: {
    name: string;
    description: string;
  };
  execute: (interaction: any) => Promise<void>;
}

export const collection = new Collection<string, Command>();

// why do we have to wrap this? god only knows,
// but if we don't, it will throw an error about top-level await not being allowed
const loading = (async () => {
  const path = join(import.meta.dirname, 'commands');
  const files = readdirSync(path)
    .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

  for (const file of files) {
    const p = pathToFileURL(join(path, file)).href;
    console.log('importing', p);
    const command = await import(p);
    if (!command.data || !command.execute)
      throw new Error(`Command ${file} is missing data or execute function.`);

    collection.set(command.data.name, command);
  }
})();

export async function registerCommands(client: Client) {
  await loading;
  if (!client.application?.id)
    throw new Error('Client application ID is not available. Ensure the client is logged in.');

  const commands = collection.map(command => command.data);
  await client.rest.put(
    Routes.applicationCommands(client.application.id),
    { body: commands }
  );
  console.log(`Registered ${commands.length} commands.`);
}