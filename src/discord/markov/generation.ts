import { eq, inArray, sql } from 'drizzle-orm';

import { markovData } from '../../database/schema.js';
import { db } from '../../database/index.js';
import { END_MARKER, MAX_WORDS, ORDER, START_MARKER } from './constants.js';
import { tokenizeMessage } from './training.js';

async function getNextWord(state: string) {
  const rows = await db.select().from(markovData).where(eq(markovData.state, state.toLowerCase()));

  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + r.count, 0);
  let rand = Math.floor(Math.random() * total);

  for (const r of rows) {
    rand -= r.count;
    if (rand < 0) return r.next;
  }

  return null;
}

export async function generateMessage(
  maxLength = MAX_WORDS,
  sentences = 1,
  start: string[] | null = null,
  order = ORDER,
): Promise<string[]> {
  const paragraph: string[] = [];

  for (let s = 0; s < sentences; s++) {
    const useStart = start && s === 0;
    let state = (useStart ? start : Array(order).fill(START_MARKER)).join(' ');
    const result: string[] = [...(useStart ? start : [])];

    for (let i = 0; i < maxLength; i++) {
      const nextWord = await getNextWord(state);
      if (!nextWord || nextWord === END_MARKER) break;

      result.push(nextWord);

      const stateWords = state.split(' ');
      stateWords.push(nextWord);
      stateWords.shift();
      state = stateWords.join(' ');
    }

    if (result.length === 0) continue;

    paragraph.push(result.join(' '));
  }

  return paragraph;
}

const MARKER_PENALTY = 0.005;
export async function getStartingPointFromString(
  str: string,
  order = ORDER
): Promise<string[] | null> {
  const tokens = tokenizeMessage(str, order);
  if (tokens.length <= order) return null;

  const candidateStates: string[] = [];
  for (let i = 0; i <= tokens.length - order; i++)
    candidateStates.push(tokens.slice(i, i + order).join(' ').toLowerCase());

  const rows = await db
    .select({
      state: markovData.state,
      totalCount: sql<number>`sum(${markovData.count})`
    })
    .from(markovData)
    .where(inArray(markovData.state, candidateStates))
    .groupBy(markovData.state);

  if (rows.length === 0) return null;

  const weighted: { state: string; weight: number }[] = rows.map(r => {
    const startCount = r.state.split(START_MARKER).length - 1;
    const endCount = r.state.split(END_MARKER).length - 1;
    const markers = startCount + endCount;

    const weight = Math.max(r.totalCount * (MARKER_PENALTY ** markers), 1e-6);

    return { state: r.state, weight };
  });

  const total = weighted.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * total;

  for (const r of weighted) {
    rand -= r.weight;
    if (rand <= 0)
      return r.state.split(' ');
  }

  return weighted[0].state.split(' ');
}
