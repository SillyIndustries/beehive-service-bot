import { defineJob } from '../utils/job.js';
import JobPool from '../utils/pool.js';

import TextElement from './elements/text.js';
import Scene from './scene.js';
import Animation, { Easing } from './animation.js';

const pool = new JobPool(2); // max 2 parallel jobs
const myJob = defineJob((/* ... */workingDir, env, name: string) => {
  // Simulate a CPU-intensive task
  console.log('hello from', name, 'in', workingDir);
  const start = Date.now();
  while (Date.now() - start < 2000) {
    // busy wait for 2 seconds
  }
  return `Job ${name} done in ${workingDir}`;
});

const a = new Scene(0, 100);
const text = new TextElement(
  'Hello, World!',
  24,
  'red',
  0,
  0,
  0,
  50
);

const animation = new Animation(text, [
  { offset: 0, easing: Easing.EASE_IN_OUT, properties: { x: 0, y: 0 } },
  { offset: 1, easing: Easing.EASE_IN_OUT, properties: { x: 200, y: 200 } }
], 0, 25);

text.animations.push(animation);
a.elements.push(text);