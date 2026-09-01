export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Cell = 0 | Digit;
export type Grid = Cell[];

export const SIZE = 81;
const FULL = 0x1ff;

export function rowOf(i: number): number {
  return (i / 9) | 0;
}
export function colOf(i: number): number {
  return i % 9;
}
export function boxOf(i: number): number {
  const r = rowOf(i);
  const c = colOf(i);
  return ((r / 3) | 0) * 3 + ((c / 3) | 0);
}

export function emptyGrid(): Grid {
  return Array<Cell>(SIZE).fill(0);
}

export function parseGrid(s: string): Grid {
  if (s.length !== SIZE) throw new Error('grid must be 81 characters');
  const g = emptyGrid();
  for (let i = 0; i < SIZE; i++) {
    const n = s.charCodeAt(i) - 48;
    if (n < 0 || n > 9) throw new Error('grid must be digits 0-9');
    g[i] = n as Cell;
  }
  return g;
}

export function formatGrid(g: Grid): string {
  return g.map((d) => String(d)).join('');
}

export function cloneGrid(g: Grid): Grid {
  return g.slice() as Grid;
}

export function clueCount(g: Grid): number {
  let n = 0;
  for (const d of g) if (d) n++;
  return n;
}

function popcount(n: number): number {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return (((n + (n >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
}

function bitDigit(bit: number): Digit {
  return (Math.log2(bit) + 1) as Digit;
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function digits(rand: () => number): Digit[] {
  return shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9] as Digit[], rand);
}

function installMasks(grid: Grid): { row: Int16Array; col: Int16Array; box: Int16Array } | null {
  const row = new Int16Array(9);
  const col = new Int16Array(9);
  const box = new Int16Array(9);
  for (let i = 0; i < SIZE; i++) {
    const d = grid[i];
    if (!d) continue;
    const bit = 1 << (d - 1);
    const r = rowOf(i);
    const c = colOf(i);
    const b = boxOf(i);
    if (row[r] & bit || col[c] & bit || box[b] & bit) return null;
    row[r] |= bit;
    col[c] |= bit;
    box[b] |= bit;
  }
  return { row, col, box };
}

export function isValidPlacement(grid: Grid, index: number, digit: Digit): boolean {
  if (grid[index] !== 0) return false;
  const r = rowOf(index);
  const c = colOf(index);
  const b = boxOf(index);
  for (let i = 0; i < SIZE; i++) {
    if (grid[i] !== digit) continue;
    if (rowOf(i) === r || colOf(i) === c || boxOf(i) === b) return false;
  }
  return true;
}

export function conflictsFor(grid: Grid, index: number, digit: Digit): number[] {
  const r = rowOf(index);
  const c = colOf(index);
  const b = boxOf(index);
  const out: number[] = [];
  for (let i = 0; i < SIZE; i++) {
    if (i === index) continue;
    if (grid[i] !== digit) continue;
    if (rowOf(i) === r || colOf(i) === c || boxOf(i) === b) out.push(i);
  }
  return out;
}

export function isCompleteValid(grid: Grid, givens?: Grid): boolean {
  if (clueCount(grid) !== SIZE) return false;
  if (!installMasks(grid)) return false;
  if (givens) {
    for (let i = 0; i < SIZE; i++) {
      if (givens[i] && givens[i] !== grid[i]) return false;
    }
  }
  return true;
}

export function countSolutions(source: Grid, limit = 2): number {
  const grid = cloneGrid(source);
  const masks = installMasks(grid);
  if (!masks) return 0;
  const { row, col, box } = masks;
  let count = 0;

  const dfs = (): boolean => {
    let best = -1;
    let bestBits = 0;
    let bestN = 10;
    for (let i = 0; i < SIZE; i++) {
      if (grid[i]) continue;
      const used = row[rowOf(i)] | col[colOf(i)] | box[boxOf(i)];
      const bits = (~used) & FULL;
      const n = popcount(bits);
      if (n === 0) return false;
      if (n < bestN) {
        bestN = n;
        best = i;
        bestBits = bits;
        if (n === 1) break;
      }
    }
    if (best === -1) {
      count += 1;
      return count >= limit;
    }
    const r = rowOf(best);
    const c = colOf(best);
    const b = boxOf(best);
    let bits = bestBits;
    while (bits) {
      const bit = bits & -bits;
      bits ^= bit;
      const d = bitDigit(bit);
      grid[best] = d;
      row[r] |= bit;
      col[c] |= bit;
      box[b] |= bit;
      const stop = dfs();
      grid[best] = 0;
      row[r] ^= bit;
      col[c] ^= bit;
      box[b] ^= bit;
      if (stop) return true;
    }
    return false;
  };

  dfs();
  return count;
}

export function hasUniqueSolution(grid: Grid): boolean {
  return countSolutions(grid, 2) === 1;
}

function fillComplete(rand: () => number): Grid {
  const grid = emptyGrid();
  const row = new Int16Array(9);
  const col = new Int16Array(9);
  const box = new Int16Array(9);

  const dfs = (pos: number): boolean => {
    if (pos === SIZE) return true;
    const i = pos;
    const r = rowOf(i);
    const c = colOf(i);
    const b = boxOf(i);
    const used = row[r] | col[c] | box[b];
    for (const d of digits(rand)) {
      const bit = 1 << (d - 1);
      if (used & bit) continue;
      grid[i] = d;
      row[r] |= bit;
      col[c] |= bit;
      box[b] |= bit;
      if (dfs(pos + 1)) return true;
      grid[i] = 0;
      row[r] ^= bit;
      col[c] ^= bit;
      box[b] ^= bit;
    }
    return false;
  };

  if (!dfs(0)) throw new Error('failed to fill a complete grid');
  return grid;
}

export function generateUniquePuzzle(
  minClues: number,
  maxClues: number,
  rand: () => number = Math.random,
  maxAttempts = 80,
): { givens: Grid; solution: Grid } {
  if (minClues < 17 || maxClues > 81 || minClues > maxClues) {
    throw new Error('invalid clue range');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = fillComplete(rand);
    const puzzle = cloneGrid(solution);
    const order = shuffle(
      Array.from({ length: SIZE }, (_, i) => i),
      rand,
    );

    for (const i of order) {
      if (clueCount(puzzle) <= minClues) break;
      const backup = puzzle[i];
      puzzle[i] = 0;
      if (countSolutions(puzzle, 2) !== 1) puzzle[i] = backup;
    }

    const clues = clueCount(puzzle);
    if (clues >= minClues && clues <= maxClues && hasUniqueSolution(puzzle)) {
      return { givens: puzzle, solution };
    }
  }

  throw new Error(`could not generate a unique puzzle with ${minClues}-${maxClues} clues`);
}

export function digitComplete(grid: Grid, digit: Digit): boolean {
  let n = 0;
  for (const d of grid) if (d === digit) n++;
  return n === 9;
}

export function unitComplete(grid: Grid, kind: 'row' | 'col' | 'box', id: number): boolean {
  const seen = new Set<number>();
  for (let i = 0; i < SIZE; i++) {
    const match =
      kind === 'row' ? rowOf(i) === id : kind === 'col' ? colOf(i) === id : boxOf(i) === id;
    if (!match) continue;
    const d = grid[i];
    if (!d || seen.has(d)) return false;
    seen.add(d);
  }
  return seen.size === 9;
}

export async function hashGivens(givens: Grid | string): Promise<string> {
  const text = typeof givens === 'string' ? givens : formatGrid(givens);
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
