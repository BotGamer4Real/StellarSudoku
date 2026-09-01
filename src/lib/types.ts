import type { CosmeticSlot, DifficultyId } from './constants';

export type PlayMode = 'single' | 'campaign' | 'daily';

export type NotesMap = Record<number, number>;

export type UndoEntry = {
  cell: number;
  prev: number;
  prevNotes: number;
};

export type WorkingState = {
  mode: PlayMode;
  difficulty: DifficultyId;
  campaignLevel?: number;
  campaignIndex?: number;
  dailyDayId?: string;
  givens: string;
  grid: string;
  notes: NotesMap;
  elapsedMs: number;
  undoStack: UndoEntry[];
  invalidAttempts: number;
  undos: number;
  powerUpsUsed: number;
  puzzleHash: string;
  timerStarted: boolean;
};

export type Profile = {
  id: string;
  display_name: string;
  coins: number;
  equipped_background: string | null;
  equipped_pad: string | null;
  equipped_flourish: string | null;
  equipped_avatar: string | null;
  equipped_banner: string | null;
  total_solves: number;
  best_times: Record<string, number>;
  campaign_best_times: Record<string, number>;
  daily_streak: number;
  last_daily_date: string | null;
  tutorial_completed: boolean;
  settings: {
    music: number;
    sfx: number;
    theme: 'dark' | 'light';
    notesDefault: boolean;
    leftHanded: boolean;
    colourBlind?: boolean;
    largeCells?: boolean;
  };
  needs_display_name: boolean;
};

export type CosmeticEquip = Partial<Record<CosmeticSlot, string | null>>;
