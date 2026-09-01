export function authRedirectTo(): string {
  return `${window.location.origin}/auth`;
}

export function authCallbackError(): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const raw = hash.get('error_description') || query.get('error_description') || hash.get('error') || query.get('error');
  if (!raw) return null;
  return raw.replace(/\+/g, ' ');
}

export function clearAuthCallbackFromUrl(): void {
  if (!window.location.hash && !window.location.search) return;
  const url = `${window.location.pathname}${window.location.search}`;
  const clean = url.split('?')[0];
  window.history.replaceState({}, '', clean);
}
