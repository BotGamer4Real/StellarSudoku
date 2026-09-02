export const DIFFICULTIES = [
  {
    id: 'asteroid_belt',
    name: 'Asteroid Belt',
    traditional: 'Easy',
    minClues: 44,
    maxClues: 48,
    coins: 10,
    powerUps: true,
  },
  {
    id: 'nebula_drift',
    name: 'Nebula Drift',
    traditional: 'Medium',
    minClues: 38,
    maxClues: 43,
    coins: 25,
    powerUps: true,
  },
  {
    id: 'star_cluster',
    name: 'Star Cluster',
    traditional: 'Hard',
    minClues: 34,
    maxClues: 37,
    coins: 50,
    powerUps: true,
  },
  {
    id: 'galaxy_edge',
    name: 'Galaxy Edge',
    traditional: 'Expert',
    minClues: 29,
    maxClues: 33,
    coins: 80,
    powerUps: true,
  },
  {
    id: 'supernova',
    name: 'Supernova',
    traditional: 'Master',
    minClues: 24,
    maxClues: 28,
    coins: 150,
    powerUps: true,
  },
  {
    id: 'black_hole',
    name: 'Black Hole',
    traditional: 'Extreme',
    minClues: 20,
    maxClues: 23,
    coins: 250,
    powerUps: false,
  },
] as const;

export type DifficultyId = (typeof DIFFICULTIES)[number]['id'];

export const CAMPAIGN_LEVELS = [
  { level: 1, name: 'Asteroid Belt Outpost', difficulty: 'asteroid_belt' },
  { level: 2, name: 'Nebula Drift Station', difficulty: 'nebula_drift' },
  { level: 3, name: 'Star Cluster Frontier', difficulty: 'star_cluster' },
  { level: 4, name: 'Galaxy Edge Observatory', difficulty: 'galaxy_edge' },
  { level: 5, name: 'Supernova Core', difficulty: 'supernova' },
  { level: 6, name: 'Black Hole Abyss', difficulty: 'black_hole' },
] as const;

export const PUZZLES_PER_LEVEL = 20;

export const COSMETICS = [
  { id: 'starfield_background', name: 'Starfield Background', slot: 'background', cost: 150 },
  { id: 'nebula_number_orbs', name: 'Nebula Number Orbs', slot: 'pad', cost: 250 },
  { id: 'spaceship_avatar', name: 'Spaceship Avatar Set', slot: 'avatar', cost: 400 },
  { id: 'comet_trail', name: 'Comet Trail Pack', slot: 'flourish', cost: 300 },
  { id: 'holographic_grid', name: 'Holographic Grid Skin', slot: 'background', cost: 200 },
  { id: 'black_hole_flourish', name: 'Black Hole Completion Flourish', slot: 'flourish', cost: 500 },
  { id: 'galaxy_banner', name: 'Galaxy Profile Banner', slot: 'banner', cost: 350 },
  { id: 'supernova_glow', name: 'Supernova Glow', slot: 'flourish', cost: 450 },
] as const;

export type CosmeticId = (typeof COSMETICS)[number]['id'];
export type CosmeticSlot = (typeof COSMETICS)[number]['slot'];

export const ACHIEVEMENTS = [
  { id: 'first_solve', name: 'First solve', description: 'Complete any puzzle.' },
  { id: 'solves_10', name: '10 solves', description: 'Complete 10 puzzles.' },
  { id: 'solves_100', name: '100 solves', description: 'Complete 100 puzzles.' },
  { id: 'solves_1000', name: '1000 solves', description: 'Complete 1000 puzzles.' },
  { id: 'first_asteroid_belt', name: 'Asteroid Belt', description: 'First Asteroid Belt solve.' },
  { id: 'first_nebula_drift', name: 'Nebula Drift', description: 'First Nebula Drift solve.' },
  { id: 'first_star_cluster', name: 'Star Cluster', description: 'First Star Cluster solve.' },
  { id: 'first_galaxy_edge', name: 'Galaxy Edge', description: 'First Galaxy Edge solve.' },
  { id: 'first_supernova', name: 'Supernova', description: 'First Supernova solve.' },
  { id: 'first_black_hole', name: 'Black Hole', description: 'First Black Hole solve.' },
  { id: 'campaign_level_1', name: 'Outpost cleared', description: 'Finish Campaign level 1.' },
  { id: 'campaign_level_2', name: 'Station cleared', description: 'Finish Campaign level 2.' },
  { id: 'campaign_level_3', name: 'Frontier cleared', description: 'Finish Campaign level 3.' },
  { id: 'campaign_level_4', name: 'Observatory cleared', description: 'Finish Campaign level 4.' },
  { id: 'campaign_level_5', name: 'Core cleared', description: 'Finish Campaign level 5.' },
  { id: 'campaign_level_6', name: 'Abyss cleared', description: 'Finish Campaign level 6.' },
  { id: 'daily_streak_7', name: 'Week in orbit', description: 'Daily streak of 7.' },
  { id: 'perfect_series_3', name: 'Triple perfect', description: 'Three perfect finishes.' },
] as const;

export const UNDO_PENALTY_MS = 5000;
export const DAILY_RESET_HOUR_GMT = 7;
export const PRIVACY_POLICY_URL = 'https://stellar-sudoku.vercel.app/privacy.html';

export const DISPLAY_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/;

export function difficultyById(id: string) {
  return DIFFICULTIES.find((d) => d.id === id);
}

export function coinsForDifficulty(id: string): number {
  return difficultyById(id)?.coins ?? 0;
}
