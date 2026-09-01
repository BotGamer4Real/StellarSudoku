export const DEV_TESTER_NAME = 'BotGamer4Real';
export const DEV_TESTER_EMAIL = 'botgamer4real@gmail.com';

export function isDevTester(displayName?: string | null, email?: string | null): boolean {
  if (displayName === DEV_TESTER_NAME) return true;
  return (email ?? '').toLowerCase() === DEV_TESTER_EMAIL;
}
