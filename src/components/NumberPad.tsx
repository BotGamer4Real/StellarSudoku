import type { PointerEvent } from 'react';
import type { Digit } from '../sudoku/engine';
import { classNames } from '../lib/format';

export function NumberPad({
  gone,
  leftHanded,
  onDragStart,
}: {
  gone: Set<number>;
  leftHanded: boolean;
  onDragStart: (d: Digit, e: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className={classNames('pad', leftHanded && 'left')}>
      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as Digit[]).map((d) => (
        <button
          key={d}
          type="button"
          className={classNames(gone.has(d) && 'gone')}
          aria-label={`Digit ${d}`}
          onPointerDown={(e) => onDragStart(d, e)}
        >
          {d}
        </button>
      ))}
    </div>
  );
}
