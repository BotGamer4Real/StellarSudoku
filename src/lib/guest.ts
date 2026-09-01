import type { DifficultyId } from './constants';
import type { WorkingState } from './types';

const KEY = 'stellarsudoku.guest.v1';

export type GuestStore = {
  tutorialDone: boolean;
  coins: number;
  solves: number;
  hashes: { hash: string; difficulty: DifficultyId }[];
  inProgress: WorkingState | null;
  mergeOffered: boolean;
};

const empty = (): GuestStore => ({
  tutorialDone: false,
  coins: 0,
  solves: 0,
  hashes: [],
  inProgress: null,
  mergeOffered: false,
});

export function loadGuest(): GuestStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

export function saveGuest(next: GuestStore): void {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearGuestProgress(): void {
  const g = loadGuest();
  saveGuest({ ...empty(), tutorialDone: g.tutorialDone, mergeOffered: true });
}
