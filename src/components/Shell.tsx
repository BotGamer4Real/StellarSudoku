import type { ReactNode } from 'react';

export function Shell({ children }: { children: ReactNode }) {
  return <div className="app-shell">{children}</div>;
}
