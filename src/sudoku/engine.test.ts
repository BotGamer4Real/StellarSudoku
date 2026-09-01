import { describe, expect, it } from 'vitest';
import {
  countSolutions,
  formatGrid,
  generateUniquePuzzle,
  hasUniqueSolution,
  isCompleteValid,
  isValidPlacement,
  mulberry32,
  parseGrid,
} from './engine';

describe('sudoku engine', () => {
  it('parses and formats a grid', () => {
    const s = '0'.repeat(81);
    expect(formatGrid(parseGrid(s))).toBe(s);
  });

  it('rejects a conflicting placement', () => {
    const g = parseGrid('1' + '0'.repeat(80));
    expect(isValidPlacement(g, 1, 1)).toBe(false);
    expect(isValidPlacement(g, 9, 1)).toBe(false);
    expect(isValidPlacement(g, 1, 2)).toBe(true);
  });

  it('generates a unique easy puzzle', () => {
    const { givens, solution } = generateUniquePuzzle(44, 48, mulberry32(42), 40);
    expect(hasUniqueSolution(givens)).toBe(true);
    expect(countSolutions(givens, 2)).toBe(1);
    expect(isCompleteValid(solution, givens)).toBe(true);
  });
});
