import { ART } from '../lib/art';

export function Coins({ amount, label = true }: { amount: number; label?: boolean }) {
  return (
    <span className="coins">
      <img src={ART.coin} alt="" width={22} height={22} />
      <span>
        {amount}
        {label ? ' Cosmic Coins' : ''}
      </span>
    </span>
  );
}
