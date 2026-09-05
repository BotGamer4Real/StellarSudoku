import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Board } from '../components/Board';
import { Flourish } from '../components/Flourish';
import { Modal } from '../components/Modal';
import { NumberPad } from '../components/NumberPad';
import { Shell } from '../components/Shell';
import { playSfx } from '../lib/audio';
import { loadLocalSettings, mergeSettings } from '../lib/applySettings';
import { difficultyById, UNDO_PENALTY_MS } from '../lib/constants';
import { isDevTester } from '../lib/devTester';
import { formatElapsed } from '../lib/format';
import { loadGuest, saveGuest } from '../lib/guest';
import { requireSupabase } from '../lib/supabase';
import type { PlayMode, UndoEntry } from '../lib/types';
import {
  cloneGrid,
  conflictsFor,
  digitComplete,
  emptyGrid,
  formatGrid,
  generateUniquePuzzle,
  hashGivens,
  isCompleteValid,
  isValidPlacement,
  parseGrid,
  unitComplete,
  type Digit,
  type Grid,
} from '../sudoku/engine';
import { useAuth } from '../state/AuthProvider';

type Result = {
  acceptedMs: number;
  coins: number;
  already: boolean;
  perfect: boolean;
};

export function PlayScreen() {
  const params = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const mode: PlayMode = loc.pathname.includes('/campaign')
    ? 'campaign'
    : loc.pathname.includes('/daily')
      ? 'daily'
      : 'single';
  const difficultyId = params.difficulty ?? 'asteroid_belt';
  const campaignLevel = Number(params.level || 1);
  const campaignIndex = Number(params.index || 1);

  const [givens, setGivens] = useState<Grid>(emptyGrid());
  const [solution, setSolution] = useState<Grid | null>(null);
  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [notes, setNotes] = useState<Record<number, number>>({});
  const [undo, setUndo] = useState<UndoEntry[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const playSettings = mergeSettings(profile?.settings ?? loadLocalSettings());
  const [notesOn, setNotesOn] = useState(playSettings.notesDefault);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [invalidAttempts, setInvalidAttempts] = useState(0);
  const [undos, setUndos] = useState(0);
  const [powerUpsUsed, setPowerUpsUsed] = useState(0);
  const [powerReady, setPowerReady] = useState(0);
  const [hash, setHash] = useState('');
  const [flashGood, setFlashGood] = useState<number[]>([]);
  const [flashBad, setFlashBad] = useState<number[]>([]);
  const [conflicts, setConflicts] = useState<number[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [continueOpen, setContinueOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(mode === 'daily');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [ghost, setGhost] = useState<{ d: Digit; x: number; y: number } | null>(null);
  const [tutorial, setTutorial] = useState(false);
  const [dailyDayId, setDailyDayId] = useState<string | null>(null);

  const runningRef = useRef(false);
  const elapsedRef = useRef(0);
  const dragRef = useRef<{ d: Digit; x: number; y: number } | null>(null);

  const diff = difficultyById(mode === 'campaign' ? (
    ['asteroid_belt','nebula_drift','star_cluster','galaxy_edge','supernova','black_hole'][campaignLevel - 1]
  ) : difficultyId) ?? difficultyById('asteroid_belt')!;

  const powerAllowed = mode !== 'daily' && diff.powerUps;
  const undoPenalty = mode !== 'single';
  const tester = isDevTester(profile?.display_name, user?.email);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(() => {
    elapsedRef.current = elapsedMs;
  }, [elapsedMs]);

  const persist = useCallback(async (next: {
    givens: Grid; grid: Grid; notes: Record<number, number>; elapsedMs: number;
    undo: UndoEntry[]; invalidAttempts: number; undos: number; powerUpsUsed: number;
    hash: string; timerStarted: boolean;
  }) => {
    if (mode === 'single' && !user) {
      const g = loadGuest();
      saveGuest({
        ...g,
        inProgress: {
          mode, difficulty: diff.id, givens: formatGrid(next.givens), grid: formatGrid(next.grid),
          notes: next.notes, elapsedMs: next.elapsedMs, undoStack: next.undo,
          invalidAttempts: next.invalidAttempts, undos: next.undos, powerUpsUsed: next.powerUpsUsed,
          puzzleHash: next.hash, timerStarted: next.timerStarted,
        },
      });
      return;
    }
    if (!user) return;
    try {
      const sb = requireSupabase();
      await sb.rpc('save_in_progress', {
        p_mode: mode,
        p_difficulty: diff.id,
        p_campaign_level: mode === 'campaign' ? campaignLevel : null,
        p_campaign_index: mode === 'campaign' ? campaignIndex : null,
        p_daily_day_id: mode === 'daily' ? dailyDayId : null,
        p_givens: formatGrid(next.givens),
        p_grid: formatGrid(next.grid),
        p_notes: next.notes,
        p_elapsed_ms: next.elapsedMs,
        p_undo_stack: next.undo,
        p_invalid_attempts: next.invalidAttempts,
        p_undos: next.undos,
        p_power_ups_used: next.powerUpsUsed,
        p_puzzle_hash: next.hash,
        p_timer_started: next.timerStarted,
      });
    } catch {
      /* retry on next change */
    }
  }, [mode, user, diff.id, campaignLevel, campaignIndex, dailyDayId]);

  const startNewSingle = useCallback(async () => {
    const puzzle = generateUniquePuzzle(diff.minClues, diff.maxClues);
    const h = await hashGivens(puzzle.givens);
    setGivens(puzzle.givens);
    setSolution(puzzle.solution);
    setGrid(cloneGrid(puzzle.givens));
    setNotes({});
    setUndo([]);
    setElapsedMs(0);
    setInvalidAttempts(0);
    setUndos(0);
    setPowerUpsUsed(0);
    setPowerReady(0);
    setHash(h);
    setResult(null);
    setRunning(true);
    setBusy(false);
  }, [diff]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      setResult(null);
      setSettingsOpen(false);
      setContinueOpen(false);
      setLaunchOpen(mode === 'daily');
      setRunning(false);
      setNotes({});
      setUndo([]);
      setElapsedMs(0);
      setInvalidAttempts(0);
      setUndos(0);
      setPowerUpsUsed(0);
      setPowerReady(0);
      setSelected(null);
      const guest = loadGuest();
      if (!guest.tutorialDone && !profile?.tutorial_completed) setTutorial(true);

      if (mode === 'single') {
        const saved = !user ? guest.inProgress : null;
        if (saved && saved.difficulty === diff.id && saved.mode === 'single') {
          setGivens(parseGrid(saved.givens));
          setGrid(parseGrid(saved.grid));
          setNotes(saved.notes);
          setUndo(saved.undoStack);
          setElapsedMs(saved.elapsedMs);
          setInvalidAttempts(saved.invalidAttempts);
          setUndos(saved.undos);
          setPowerUpsUsed(saved.powerUpsUsed);
          setHash(saved.puzzleHash);
          setContinueOpen(true);
          setBusy(false);
          return;
        }
        if (user) {
          try {
            const sb = requireSupabase();
            const { data } = await sb.from('in_progress').select('*').eq('mode', 'single').maybeSingle();
            if (!cancelled && data && data.difficulty === diff.id) {
              setGivens(parseGrid(data.givens));
              setGrid(parseGrid(data.grid));
              setNotes(data.notes ?? {});
              setUndo(data.undo_stack ?? []);
              setElapsedMs(data.elapsed_ms);
              setInvalidAttempts(data.invalid_attempts);
              setUndos(data.undos);
              setPowerUpsUsed(data.power_ups_used);
              setHash(data.puzzle_hash);
              setContinueOpen(true);
              setBusy(false);
              return;
            }
          } catch {
            /* generate */
          }
        }
        if (!cancelled) await startNewSingle();
        return;
      }

      if (!user) {
        nav('/auth?next=' + encodeURIComponent(window.location.pathname));
        return;
      }
      const sb = requireSupabase();
      if (mode === 'campaign') {
        const { data, error: qErr } = await sb
          .from('campaign_catalog')
          .select('*')
          .eq('level', campaignLevel)
          .eq('puzzle_index', campaignIndex)
          .single();
        if (qErr || !data) {
          setError(qErr?.message ?? 'Campaign puzzle missing. Seed the catalog.');
          setBusy(false);
          return;
        }
        const g = parseGrid(data.givens);
        const h = await hashGivens(g);
        setGivens(g);
        setSolution(null);
        setGrid(cloneGrid(g));
        setHash(h);
        const saved = await sb.from('in_progress').select('*').eq('mode', 'campaign').maybeSingle();
        if (saved.data && saved.data.campaign_level === campaignLevel && saved.data.campaign_index === campaignIndex) {
          setGrid(parseGrid(saved.data.grid));
          setNotes(saved.data.notes ?? {});
          setUndo(saved.data.undo_stack ?? []);
          setElapsedMs(saved.data.elapsed_ms);
          setContinueOpen(true);
        } else {
          setRunning(true);
        }
        setBusy(false);
        return;
      }

      const { data: win, error: wErr } = await sb.rpc('current_daily_window');
      const windowRow = Array.isArray(win) ? win[0] : win;
      if (wErr || !windowRow) {
        setError(wErr?.message ?? 'No daily window');
        setBusy(false);
        return;
      }
      const { data: daily, error: dErr } = await sb
        .from('daily_catalog')
        .select('*')
        .eq('day_id', windowRow.day_id)
        .maybeSingle();
      if (dErr || !daily) {
        setError('Today\'s Daily is not published yet.');
        setBusy(false);
        return;
      }
      const g = parseGrid(daily.givens);
      setGivens(g);
      setGrid(cloneGrid(g));
      setHash(await hashGivens(g));
      setDailyDayId(daily.day_id);
      setLaunchOpen(true);
      setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, diff.id, campaignLevel, campaignIndex, user, nav, startNewSingle, profile?.tutorial_completed]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (!runningRef.current || document.hidden) return;
      setElapsedMs((ms) => ms + 100);
    }, 100);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!powerAllowed) return;
    const minutes = Math.floor(elapsedMs / 60000);
    if (minutes >= 3) setPowerReady(4);
    else if (minutes >= 2) setPowerReady(2);
    else if (minutes >= 1) setPowerReady(1);
  }, [elapsedMs, powerAllowed]);

  const gone = useMemo(() => {
    const s = new Set<number>();
    for (let d = 1; d <= 9; d++) if (digitComplete(grid, d as Digit)) s.add(d);
    return s;
  }, [grid]);

  const completeUnits = useMemo(() => {
    const rows: number[] = [];
    const cols: number[] = [];
    const boxes: number[] = [];
    for (let i = 0; i < 9; i++) {
      if (unitComplete(grid, 'row', i)) rows.push(i);
      if (unitComplete(grid, 'col', i)) cols.push(i);
      if (unitComplete(grid, 'box', i)) boxes.push(i);
    }
    return { rows, cols, boxes };
  }, [grid]);

  const highlightDigit = selected != null && grid[selected] ? (grid[selected] as Digit) : null;

  const place = (index: number, digit: Digit) => {
    if (givens[index]) return;
    if (notesOn) {
      playSfx('tap');
      setNotes((n) => ({ ...n, [index]: (n[index] ?? 0) ^ (1 << (digit - 1)) }));
      return;
    }
    if (!isValidPlacement(grid, index, digit) && grid[index] !== digit) {
      playSfx('invalid');
      const conf = conflictsFor(grid, index, digit);
      setConflicts(conf);
      setFlashBad([index, ...conf]);
      setInvalidAttempts((n) => n + 1);
      window.setTimeout(() => {
        setFlashBad([]);
        setConflicts([]);
      }, 420);
      return;
    }
    const prev = grid[index];
    const prevNotes = notes[index] ?? 0;
    const next = cloneGrid(grid);
    next[index] = digit;
    setGrid(next);
    setNotes((n) => {
      const copy = { ...n };
      delete copy[index];
      return copy;
    });
    setUndo((u) => [...u, { cell: index, prev, prevNotes }]);
    playSfx('place');
    setFlashGood([index]);
    window.setTimeout(() => setFlashGood([]), 280);
    void persist({
      givens, grid: next, notes, elapsedMs: elapsedRef.current, undo: [...undo, { cell: index, prev, prevNotes }],
      invalidAttempts, undos, powerUpsUsed, hash, timerStarted: true,
    });
    if (isCompleteValid(next, givens)) {
      setRunning(false);
      void finish(next);
    }
  };

  const finish = async (finalGrid: Grid) => {
    playSfx('complete');
    const raw = elapsedRef.current;
    const accepted = undoPenalty ? raw + undos * UNDO_PENALTY_MS : raw;
    const perfect = invalidAttempts === 0 && undos === 0 && powerUpsUsed === 0;
    try {
      if (mode === 'single' && !user) {
        const already = loadGuest().hashes.some((h) => h.hash === hash);
        const coins = already ? 0 : diff.coins;
        const g = loadGuest();
        saveGuest({
          ...g,
          solves: g.solves + 1,
          coins: g.coins + coins,
          hashes: already ? g.hashes : [...g.hashes, { hash, difficulty: diff.id }],
          inProgress: null,
        });
        setResult({ acceptedMs: accepted, coins, already, perfect });
        return;
      }
      if (!user) {
        setError('Sign in to submit this result.');
        return;
      }
      const sb = requireSupabase();
      if (mode === 'single') {
        const { data, error: e } = await sb.rpc('submit_single_completion', {
          p_hash: hash,
          p_givens: formatGrid(givens),
          p_grid: formatGrid(finalGrid),
          p_difficulty: diff.id,
          p_elapsed_ms: raw,
        });
        if (e) throw e;
        setResult({
          acceptedMs: raw,
          coins: data.coins,
          already: data.already,
          perfect: false,
        });
      } else if (mode === 'campaign') {
        const { data, error: e } = await sb.rpc('submit_campaign_completion', {
          p_level: campaignLevel,
          p_index: campaignIndex,
          p_grid: formatGrid(finalGrid),
          p_elapsed_ms: raw,
          p_invalid_attempts: invalidAttempts,
          p_undos: undos,
          p_power_ups: powerUpsUsed,
        });
        if (e) throw e;
        setResult({
          acceptedMs: data.accepted_ms,
          coins: data.coins,
          already: data.already,
          perfect: data.perfect,
        });
      } else {
        const { data: win } = await sb.rpc('current_daily_window');
        const dayId = Array.isArray(win) ? win[0].day_id : win.day_id;
        const { data, error: e } = await sb.rpc('submit_daily_completion', {
          p_day_id: dayId,
          p_grid: formatGrid(finalGrid),
          p_elapsed_ms: raw,
          p_undos: undos,
          p_invalid_attempts: invalidAttempts,
        });
        if (e) throw e;
        setResult({
          acceptedMs: data.accepted_ms,
          coins: data.coins,
          already: data.already,
          perfect: data.perfect ?? false,
        });
      }
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    }
  };

  const undoMove = () => {
    const last = undo[undo.length - 1];
    if (!last) return;
    playSfx('undo');
    const next = cloneGrid(grid);
    next[last.cell] = last.prev as Grid[number];
    setGrid(next);
    setNotes((n) => ({ ...n, [last.cell]: last.prevNotes }));
    setUndo((u) => u.slice(0, -1));
    setUndos((n) => n + 1);
  };

  const autoComplete = async () => {
    if (!tester || result) return;
    setRunning(false);
    setLaunchOpen(false);
    setContinueOpen(false);
    setError(null);
    try {
      if (mode === 'campaign') {
        const sb = requireSupabase();
        const { data, error: e } = await sb.rpc('dev_complete_campaign_puzzle', {
          p_level: campaignLevel,
          p_index: campaignIndex,
        });
        if (e) throw e;
        playSfx('complete');
        setResult({
          acceptedMs: data.accepted_ms,
          coins: data.coins,
          already: data.already,
          perfect: data.perfect,
        });
        await refreshProfile();
        return;
      }
      if (mode === 'daily') {
        const sb = requireSupabase();
        const { data, error: e } = await sb.rpc('dev_complete_daily');
        if (e) throw e;
        playSfx('complete');
        setResult({
          acceptedMs: data.accepted_ms,
          coins: data.coins,
          already: data.already,
          perfect: data.perfect ?? false,
        });
        await refreshProfile();
        return;
      }
      if (!solution) {
        setError('No solution on this board to auto-complete.');
        return;
      }
      setGrid(cloneGrid(solution));
      await finish(solution);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Auto-complete failed');
    }
  };

  const applyHint = async () => {
    if (!powerAllowed || powerUpsUsed >= powerReady) return;
    let index = -1;
    let digit: Digit | null = null;
    if (solution) {
      index = solution.findIndex((_, i) => grid[i] === 0);
      if (index >= 0) digit = solution[index] as Digit;
    } else if (mode === 'campaign') {
      const sb = requireSupabase();
      const { data, error: e } = await sb.rpc('campaign_hint', {
        p_level: campaignLevel,
        p_index: campaignIndex,
        p_grid: formatGrid(grid),
      });
      if (e) {
        setError(e.message);
        return;
      }
      if (data?.index == null) return;
      index = data.index;
      digit = data.digit as Digit;
    }
    if (index < 0 || !digit) return;
    setPowerUpsUsed((n) => n + 1);
    place(index, digit);
  };

  const onDragStart = (d: Digit, e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { d, x: e.clientX, y: e.clientY };
    setGhost({ d, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragRef.current) return;
      dragRef.current = { ...dragRef.current, x: e.clientX, y: e.clientY };
      setGhost({ ...dragRef.current });
    };
    const up = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el instanceof HTMLElement ? el.closest('[data-cell]') : null;
      const idx = cell instanceof HTMLElement ? Number(cell.getAttribute('data-cell')) : NaN;
      const d = dragRef.current.d;
      dragRef.current = null;
      setGhost(null);
      if (Number.isInteger(idx)) place(idx, d);
      else if (selected != null) place(selected, d);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  });

  const title =
    mode === 'daily' ? 'Daily Challenge' : mode === 'campaign' ? `Level ${campaignLevel} · ${campaignIndex}` : diff.name;

  if (busy) {
    return (
      <Shell>
        <p className="muted">Loading puzzle…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Flourish equipped={profile?.equipped_flourish} show={Boolean(result)} />
      <div className="topbar">
        <Link className="icon-btn" to="/" onClick={() => setRunning(false)}>←</Link>
        <div className="grow">
          <strong>{title}</strong>
          <div className="muted">{formatElapsed(undoPenalty ? elapsedMs + undos * UNDO_PENALTY_MS : elapsedMs)}</div>
        </div>
        <button className="icon-btn" type="button" onClick={() => { setSettingsOpen(true); setRunning(false); }}>⚙</button>
      </div>
      {error && <p className="error">{error}</p>}
      <Board
        givens={givens}
        grid={grid}
        notes={notes}
        selected={selected}
        highlightDigit={highlightDigit}
        flashGood={flashGood}
        flashBad={flashBad}
        conflicts={conflicts}
        completeUnits={completeUnits}
        onSelect={(i) => {
          playSfx('tap');
          setSelected(i);
        }}
      />
      <div className="row space">
        <button className="btn" type="button" onClick={undoMove} disabled={!undo.length}>Undo</button>
        <button className="btn" type="button" onClick={() => setNotesOn((v) => !v)}>
          Notes {notesOn ? 'on' : 'off'}
        </button>
        {powerAllowed && (
          <button className="btn" type="button" onClick={() => void applyHint()} disabled={powerUpsUsed >= powerReady}>
            Boost {powerReady - powerUpsUsed}
          </button>
        )}
        {tester && !result && (
          <button className="btn danger" type="button" onClick={() => void autoComplete()}>
            AUTO
          </button>
        )}
      </div>
      <NumberPad gone={gone} leftHanded={playSettings.leftHanded} onDragStart={onDragStart} />

      {ghost && (
        <div className="ghost" style={{ left: ghost.x - 22, top: ghost.y - 22 }}>{ghost.d}</div>
      )}

      {launchOpen && (
        <Modal title="Daily Challenge">
          <p className="muted">One shared board. Timer starts after Launch. Power-ups are off. Undo adds 5 seconds each.</p>
          <button className="btn primary" onClick={() => { setLaunchOpen(false); setRunning(true); }}>Launch Puzzle</button>
          <Link className="btn" to="/">Back</Link>
        </Modal>
      )}

      {continueOpen && (
        <Modal title="Continue?">
          <p className="muted">Resume this board. Timer stays paused until you continue.</p>
          <button className="btn primary" onClick={() => { setContinueOpen(false); setRunning(true); }}>Continue</button>
          {mode === 'single' && (
            <button className="btn" onClick={() => { setContinueOpen(false); void startNewSingle(); }}>New Puzzle</button>
          )}
        </Modal>
      )}

      {settingsOpen && (
        <Modal title="Settings" onClose={() => { setSettingsOpen(false); if (!result && !launchOpen) setRunning(true); }}>
          <p className="muted">Timer is paused while settings are open.</p>
          <Link className="btn" to="/settings">Full settings</Link>
          <button className="btn" onClick={() => { setSettingsOpen(false); if (!result && !launchOpen) setRunning(true); }}>Close</button>
        </Modal>
      )}

      {tutorial && (
        <Modal title="How to play">
          <p>Tap a cell, then a digit — or drag a digit onto a cell.</p>
          <p>Matching numbers highlight. Invalid moves flash and are not placed.</p>
          <p>A digit leaves the pad when all nine are correctly on the board. Undo is unlimited.</p>
          <p>Daily Challenge lives on the home screen and resets at 07:00 GMT.</p>
          <button
            className="btn primary"
            onClick={() => {
              const g = loadGuest();
              saveGuest({ ...g, tutorialDone: true });
              setTutorial(false);
            }}
          >
            Got it
          </button>
        </Modal>
      )}

      {result && (
        <Modal title="Puzzle complete">
          <p>Time {formatElapsed(result.acceptedMs)}</p>
          <p>{result.already ? 'Already earned coins for this board' : `Coins granted: ${result.coins}`}</p>
          {result.perfect && mode !== 'single' && <p className="ok">Perfect solve</p>}
          {powerUpsUsed > 0 && <p className="muted">Power-up used — not Perfect</p>}
          {mode === 'single' && (
            <>
              <button className="btn" onClick={() => { setResult(null); setGrid(cloneGrid(givens)); setNotes({}); setUndo([]); setElapsedMs(0); setRunning(true); }}>Replay</button>
              <button className="btn primary" onClick={() => void startNewSingle()}>New Puzzle</button>
            </>
          )}
          {mode === 'campaign' && campaignIndex < 20 && (
            <button
              className="btn primary"
              onClick={() => {
                setResult(null);
                nav(`/play/campaign/${campaignLevel}/${campaignIndex + 1}`);
              }}
            >
              Next Campaign puzzle
            </button>
          )}
          {mode === 'campaign' && campaignIndex >= 20 && (
            <button className="btn primary" onClick={() => nav('/campaign')}>Back to Campaign</button>
          )}
          {mode === 'daily' && <button className="btn" onClick={() => { setResult(null); setGrid(cloneGrid(givens)); setNotes({}); setUndo([]); }}>Replay (practice)</button>}
          <button
            className="btn"
            type="button"
            onClick={async () => {
              const text = `StellarSudoku — ${title} in ${formatElapsed(result.acceptedMs)}. ${
                result.already ? 'Already earned coins for this board.' : `Coins ${result.coins}.`
              }`;
              try {
                if (navigator.share) {
                  await navigator.share({ title: 'StellarSudoku', text });
                } else {
                  await navigator.clipboard.writeText(text);
                  setShareMsg('Copied summary');
                }
              } catch {
                /* cancelled */
              }
            }}
          >
            Share
          </button>
          {shareMsg && <p className="ok">{shareMsg}</p>}
          <Link className="btn" to="/">Back to menu</Link>
        </Modal>
      )}
    </Shell>
  );
}
