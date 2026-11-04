'use client';

import { LEVELS, levelCount, type Level, type LevelCounts } from '@/lib/levels';

type Props = {
  value: Level;
  onChange: (level: Level) => void;
  /** Questions at each level; a level is only offered when it has at least `min` of them. */
  counts: LevelCounts;
  min?: number;
  /** Show how many questions each level has. */
  showCounts?: boolean;
};

/** Easy / Medium / Hard / Mixed, as a row of toggle buttons like the language switch. */
export function LevelSwitch({ value, onChange, counts, min = 1, showCounts = true }: Props) {
  const levels = LEVELS.filter((l) => levelCount(counts, l.id) >= min);
  return (
    <div className="filters no-print" role="radiogroup" aria-label="Question level">
      {levels.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={value === l.id}
          aria-label={showCounts ? `${l.label}, ${levelCount(counts, l.id)} questions` : undefined}
          className={value === l.id ? 'on' : ''}
          onClick={() => onChange(l.id)}
        >
          {l.label}
          {showCounts && <span className="level-count">{levelCount(counts, l.id)}</span>}
        </button>
      ))}
    </div>
  );
}

/** The level actually used: the chosen one if it has enough questions here, otherwise Mixed. */
export function availableLevel(level: Level, counts: LevelCounts, min = 1): Level {
  return levelCount(counts, level) >= min ? level : 'mixed';
}
