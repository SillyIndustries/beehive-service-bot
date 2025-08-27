import { client } from './discord/client.js';
import { start } from './discord/main.js';
import { learnOnEveryMessageOnServer } from './discord/markov/main.js';

client.on('clientReady', async () => {
  await learnOnEveryMessageOnServer(client);
  process.exit(0);
});

await start();