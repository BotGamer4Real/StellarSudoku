import { writeFileSync } from 'node:fs';
import { CAMPAIGN_LEVELS, DIFFICULTIES, PUZZLES_PER_LEVEL, difficultyById } from '../src/lib/constants';
import { formatGrid, generateUniquePuzzle, mulberry32 } from '../src/sudoku/engine';

function sqlStr(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const lines: string[] = [
  '-- Generated campaign (120) and daily (90) puzzles. Unique solutions only.',
  'truncate public.campaign_puzzles;',
  'truncate public.daily_puzzles;',
];

let seed = 20260901;
const rand = () => {
  seed += 1;
  return mulberry32(seed)();
};

console.log('Generating campaign puzzles...');
for (const level of CAMPAIGN_LEVELS) {
  const diff = difficultyById(level.difficulty);
  if (!diff) throw new Error(level.difficulty);
  for (let i = 1; i <= PUZZLES_PER_LEVEL; i++) {
    const { givens, solution } = generateUniquePuzzle(diff.minClues, diff.maxClues, rand, 120);
    lines.push(
      `insert into public.campaign_puzzles (level, puzzle_index, difficulty, givens, solution) values (${level.level}, ${i}, ${sqlStr(diff.id)}, ${sqlStr(formatGrid(givens))}, ${sqlStr(formatGrid(solution))});`,
    );
    console.log(`  campaign L${level.level} #${i} clues=${givens.filter((c) => c !== 0).length}`);
  }
}

console.log('Generating daily puzzles...');
const start = new Date(Date.UTC(2026, 8, 1, 7, 0, 0));
for (let n = 0; n < 90; n++) {
  const from = new Date(start.getTime() + n * 86400000);
  const to = new Date(from.getTime() + 86400000);
  const diff = n % 2 === 0 ? DIFFICULTIES[2] : DIFFICULTIES[3];
  const { givens, solution } = generateUniquePuzzle(diff.minClues, diff.maxClues, rand, 80);
  lines.push(
    `insert into public.daily_puzzles (day_id, difficulty, givens, solution, valid_from, valid_to) values (${sqlStr(ymd(from))}, ${sqlStr(diff.id)}, ${sqlStr(formatGrid(givens))}, ${sqlStr(formatGrid(solution))}, ${sqlStr(from.toISOString())}, ${sqlStr(to.toISOString())});`,
  );
  console.log(`  daily ${ymd(from)} ${diff.id}`);
}

writeFileSync('supabase/migrations/00002_seed_puzzles.sql', lines.join('\n') + '\n');
console.log('Wrote supabase/migrations/00002_seed_puzzles.sql');
