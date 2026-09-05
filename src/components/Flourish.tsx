import { flourishSrc } from '../lib/art';

export function Flourish({ equipped, show }: { equipped?: string | null; show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="flourish"
      aria-hidden
      style={{ backgroundImage: `url("${flourishSrc(equipped)}")` }}
    />
  );
}
