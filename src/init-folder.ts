import { start, ustart } from './telegram/client.js';
import { initializeFolder } from './telegram/folder.js';
await start();
await ustart();
await initializeFolder();