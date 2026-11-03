'use client';

import { useEffect, useState } from 'react';
import { daysToExam, formatExamDate } from '@/lib/qualifier';

/** Days left to the qualifier exam (QUALIFIER_EXAM_DATE), worked out in the student's browser so it's never stale. */
export function useDaysToExam(): number | null {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setDays(daysToExam(new Date()));
    update();
    // Past midnight the count goes down without a reload.
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return days;
}

/** The hero at the top of the qualifier pages: the countdown, and a reminder to confirm the date. */
export function QualifierCountdown({ title, children }: { title: string; children?: React.ReactNode }) {
  const days = useDaysToExam();
  const date = formatExamDate();

  return (
    <section className="hero">
      <div>
        <span className="hero-label">★ {title.toUpperCase()}</span>
        <h1>
          {days === null ? 'Qualifier countdown' : days > 1 ? `${days} days to go` : days === 1 ? 'Exam tomorrow' : days === 0 ? 'Exam day: all the best!' : 'This exam date has passed'}
        </h1>
        <p>
          {days !== null && days < 0
            ? `The date we have is ${date}. Check the next qualifier date on the official site.`
            : `Qualifier exam: ${date}. Exam dates can differ by term, session and centre, so confirm yours on your hall ticket or the official portal.`}
        </p>
        {children && <div className="hero-actions">{children}</div>}
      </div>
      <div className="hero-art countdown-art" aria-hidden="true">
        <span className="countdown-days">{days === null || days < 0 ? '★' : days}</span>
        {days !== null && days >= 0 && <small>{days === 1 ? 'DAY' : 'DAYS'}</small>}
      </div>
    </section>
  );
}
