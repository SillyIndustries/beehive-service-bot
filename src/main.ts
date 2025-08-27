import './redis/index.js';
import './database/index.js';

import './web/main.js';

import { start as discord } from './discord/main.js';
import { start as telegram } from './telegram/main.js';
import { start as web } from './web/main.js';

await discord();
await telegram();
await web();