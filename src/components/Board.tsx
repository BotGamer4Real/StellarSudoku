import { boxOf, colOf, rowOf, type Digit, type Grid } from '../sudoku/engine';
import { classNames } from '../lib/format';

export function Board({
  givens,
  grid,
  notes,
  selected,
  highlightDigit,
  flashGood,
  flashBad,
  conflicts,
  completeUnits,
  onSelect,
}: {
  givens: Grid;
  grid: Grid;
  notes: Record<number, number>;
  selected: number | null;
  highlightDigit: Digit | null;
  flashGood: number[];
  flashBad: number[];
  conflicts: number[];
  completeUnits: { rows: number[]; cols: number[]; boxes: number[] };
  onSelect: (index: number) => void;
}) {
  const selRow = selected == null ? -1 : rowOf(selected);
  const selCol = selected == null ? -1 : colOf(selected);
  const selBox = selected == null ? -1 : boxOf(selected);

  return (
    <div className="board-wrap">
      <div className="board" role="grid" aria-label="Sudoku board">
        {grid.map((digit, i) => {
          const r = rowOf(i);
          const c = colOf(i);
          const given = givens[i] !== 0;
          const same = Boolean(highlightDigit && digit === highlightDigit);
          const unit =
            i !== selected && (r === selRow || c === selCol || boxOf(i) === selBox);
          const noteBits = notes[i] ?? 0;
          return (
            <button
              key={i}
              type="button"
              data-cell={i}
              className={classNames(
                'cell',
                given && 'given',
                !given && digit !== 0 && 'entry',
                selected === i && 'selected',
                same && 'same',
                unit && 'unit',
                flashGood.includes(i) && 'good',
                (flashBad.includes(i) || conflicts.includes(i)) && 'bad',
                completeUnits.rows.includes(r) && 'good',
                completeUnits.cols.includes(c) && 'good',
                completeUnits.boxes.includes(boxOf(i)) && 'good',
                c % 3 === 2 && c !== 8 && 'box-r',
                r % 3 === 2 && r !== 8 && 'box-b',
              )}
              onClick={() => onSelect(i)}
            >
              {digit ? (
                digit
              ) : noteBits ? (
                <span className="notes">
                  {Array.from({ length: 9 }, (_, n) => (
                    <span key={n}>{(noteBits & (1 << n)) ? n + 1 : ''}</span>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
