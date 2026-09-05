import type { PointerEvent } from 'react';
import type { Digit } from '../sudoku/engine';
import { classNames } from '../lib/format';

export function NumberPad({
  gone,
  activeDigit,
  onDragStart,
}: {
  gone: Set<number>;
  activeDigit: Digit | null;
  onDragStart: (d: Digit, e: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="pad">
      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as Digit[]).map((d) => (
        <button
          key={d}
          type="button"
          className={classNames(gone.has(d) && 'gone', activeDigit === d && 'active')}
          aria-label={`Digit ${d}`}
          aria-pressed={activeDigit === d}
          onPointerDown={(e) => onDragStart(d, e)}
        >
          {d}
        </button>
      ))}
    </div>
  );
}
