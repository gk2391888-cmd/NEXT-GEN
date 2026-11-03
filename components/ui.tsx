import type { Subject } from '@/lib/types';

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

export function SubjectIcon({ subject, size = 42 }: { subject: Subject; size?: number }) {
  return (
    <span className="subject-icon" style={{ background: subject.tone, color: subject.color, width: size, height: size }} aria-hidden="true">
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

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

/** Colour for an accuracy figure: green from 75%, amber from 50%, red below. */
export const accuracyColor = (accuracy: number) => (accuracy >= 75 ? 'var(--teal)' : accuracy >= 50 ? 'var(--yellow)' : 'var(--red)');
