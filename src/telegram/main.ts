import { start as login, ustart } from './client.js';

export async function start() {
  await login();
  await ustart();
}