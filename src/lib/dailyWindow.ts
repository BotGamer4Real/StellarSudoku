import { DAILY_RESET_HOUR_GMT } from './constants';

export type DailyWindow = {
  dayId: string;
  validFrom: Date;
  validTo: Date;
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dailyWindowAt(now = new Date()): DailyWindow {
  const utc = new Date(now.getTime());
  const start = new Date(
    Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), DAILY_RESET_HOUR_GMT, 0, 0, 0),
  );
  if (utc.getTime() < start.getTime()) {
    start.setUTCDate(start.getUTCDate() - 1);
  }
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 1);
  return { dayId: ymd(start), validFrom: start, validTo: end };
}

export function formatResetLabel(): string {
  return '07:00 GMT';
}
