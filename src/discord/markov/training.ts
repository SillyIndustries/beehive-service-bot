import { sql } from 'drizzle-orm';

import { db } from '../../database/index.js';
import { markovData } from '../../database/schema.js';
import { END_MARKER, ORDER, START_MARKER } from './constants.js';

export function tokenizeMessage(message: string, order = ORDER): string[] {
  const words = message
    .split(/\s+/)
    .filter(Boolean);

  return [ ...new Array(order).fill(START_MARKER), ...words, ...new Array(order).fill(END_MARKER) ];
}

export async function trainOnMessage(message: string, order = ORDER) {
  const tokens = tokenizeMessage(message, order);
  const counts: Record<string, number> = {};

  const separator = '\x00';
  for (let i = 0; i < tokens.length - order; i++) {
    const state = tokens.slice(i, i + order).join(' ').toLowerCase();
    const next = tokens[i + order];

    if (!next || next === END_MARKER && state.split(' ').every(w => w === START_MARKER))
      continue;

    const key = state + separator + next;

    counts[key] = (counts[key] || 0) + 1;
  }

  const values = Object.entries(counts).map(([key, count]) => {
    const [state, next] = key.split(separator);
    return { state, next, count };
  });

  if (values.length > 0)
    await db.insert(markovData)
      .values(values)
      .onConflictDoUpdate({
        target: [markovData.state, markovData.next],
        set: { count: sql`${markovData.count} + EXCLUDED.count` }
      });
}
