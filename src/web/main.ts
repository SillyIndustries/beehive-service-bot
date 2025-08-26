import Fastify from 'fastify';
import formBody from '@fastify/formbody';
import fastifyCookie from '@fastify/cookie';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { env } from '../env.js';

const fastify = Fastify({ logger: true });
fastify.register(formBody);
fastify.register(fastifyCookie, {
  secret: env.COOKIE_SECRET
});

const loading = (async () => {
  const path = join(import.meta.dirname, 'modules');
  const files = readdirSync(path)
    .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

  for (const file of files) {
    const p = pathToFileURL(join(path, file)).href;

    console.log('importing', p);
    const command = await import(p);
    fastify.register(command.default);
  }
})();

await loading;
await fastify.listen({ port: env.PORT });
console.log('listening on :' + env.PORT);