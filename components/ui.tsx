import type { Subject } from '@/lib/types';
import { token, type Token } from '@/lib/tokens';

/** Renders the only inline formatting the content files use: **bold** and `code`. */
export function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
        return part;
      })}
    </>
  );
}

/** A subject's identity colour token (`solid` for glyphs and bars, `soft` for tiles). */
export const subjectColor = (subjectId: string, variant: 'solid' | 'soft' = 'solid') => token(`color-subject-${subjectId}-${variant}` as Token);

/** `lg` (44px) on cards, `md` (36px) in lists, `sm` (28px) in tables. */
export function SubjectIcon({ subject, size = 'lg' }: { subject: Subject; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`subject-icon ${size}`} style={{ background: subjectColor(subject.id, 'soft'), color: subjectColor(subject.id) }} aria-hidden="true">
      {subject.icon}
    </span>
  );
}

export function PageHead({ kicker, title, description, action }: { kicker: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <div className="kicker">{kicker}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** `color` is a token, e.g. subjectColor(id) or accuracyColor(n). */
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

/** Fill colour for an accuracy figure (progress bars): green from 75%, amber from 50%, red below. */
export const accuracyColor = (accuracy: number) =>
  token(accuracy >= 75 ? 'color-success-solid' : accuracy >= 50 ? 'color-warning-solid' : 'color-danger-solid');

/** Text class for an accuracy figure, with readable contrast: tone-good / tone-fair / tone-poor. */
export const accuracyTone = (accuracy: number) => (accuracy >= 75 ? 'tone-good' : accuracy >= 50 ? 'tone-fair' : 'tone-poor');

/** Seconds as mm:ss, or h:mm:ss from an hour. */
export function formatClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
