'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import subjectList from '@/content/subjects.json';
import { useProgress } from '@/lib/progress/store';
import { setChoice, useChoice, useChosen } from '@/lib/programme-choice';
import { getQualifier } from '@/lib/qualifier';
import {
  CHOICES,
  choiceHas,
  choiceLabel,
  choiceWithSubject,
  inChoice,
  QUALIFIER_PATH,
  qualifierChoiceId,
  qualifierFor,
  type Choice,
  type Tool,
} from '@/lib/programmes';

/** The pages behind each tool that only some choices have (see `choiceHas`). */
const TOOL_PAGES: Record<string, Tool> = { qualifier: 'qualifier', tests: 'tests', lab: 'lab', grades: 'grades' };
/** Pages that belong to one subject: /library/<subject>/<week>, /practice/<subject>/<week>, /tests/<subject>/<test>. */
const SUBJECT_PAGES = new Set(['library', 'practice', 'tests']);

const subjectName = new Map((subjectList as { id: string; name: string }[]).map((s) => [s.id, s.name]));

/** `switchTo` is a choice id to offer; `then` is where to go after switching, when the page itself won't fit. */
type Notice = { text: string; link?: { href: string; label: string }; switchTo?: string; then?: string };

/**
 * Shown above a page that isn't part of the student's choice: another programme's notes opened from a shared link,
 * the Coding Lab for an Electronic Systems student, week 9 for a qualifier student. The page still opens (links from
 * friends and Google keep working); the notice says so and offers to switch or go back.
 */
export function ChoiceNotice() {
  const pathname = usePathname();
  const router = useRouter();
  const state = useProgress();
  const choice = useChoice();
  const chosen = useChosen();
  if (!chosen) return null;
  const notice = noticeFor(pathname, choice);
  if (!notice) return null;
  const target = notice.switchTo && CHOICES.find((c) => c.id === notice.switchTo);

  return (
    <div className="alert mb-lg flex-between" role="status">
      <span>{notice.text}</span>
      <span className="btn-group">
        {target && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setChoice(target.id, state.profile);
              if (notice.then) router.push(notice.then);
            }}
          >
            Switch to {target.label}
          </button>
        )}
        {notice.link && <Link className="btn btn-secondary" href={notice.link.href}>{notice.link.label}</Link>}
      </span>
    </div>
  );
}

function noticeFor(pathname: string, choice: Choice): Notice | undefined {
  const [section, id, rest] = pathname.split('/').slice(1);
  const mine = choice.qualifier ? `the ${choiceLabel(choice)}` : choiceLabel(choice);
  const ownFoundation = `${choice.programme.id}/${choice.programme.levels[0].id}`;
  const tool = TOOL_PAGES[section];

  if (tool && !choiceHas(choice, tool)) {
    switch (tool) {
      case 'qualifier': {
        const q = qualifierFor(choice.programme.id);
        return {
          text: `Qualifier Prep is for students who haven’t been admitted yet. You’re preparing for ${mine}.`,
          switchTo: qualifierChoiceId(q),
          // On the landing page, go on to that qualifier's own page.
          then: id ? undefined : `${QUALIFIER_PATH}/${q}`,
          link: { href: '/library', label: 'Back to my library' },
        };
      }
      case 'lab':
        return {
          text: choice.qualifier
            ? 'The Coding Lab is for the Python course, after admission. The qualifier doesn’t test Python coding.'
            : `The Coding Lab runs Python, a Data Science Foundation course. It isn’t part of ${mine}.${
                inChoice(choice, 'cprog') ? ' For C, practise the “what does this print?” questions in Practice Quiz.' : ''
              }`,
          switchTo: 'ds/foundation',
          link: { href: '/library', label: 'Back to my library' },
        };
      case 'tests':
        return {
          text: `Course mock tests are for admitted students. Your qualifier mocks, one section per course, are in Qualifier Prep.`,
          link: { href: `${QUALIFIER_PATH}/${choice.qualifier}`, label: 'My qualifier mocks →' },
          switchTo: ownFoundation,
        };
      case 'grades':
        return {
          text: 'The Grade Calculator works out course grades after admission. For the qualifier, see the pass rules in Qualifier Prep.',
          link: { href: `${QUALIFIER_PATH}/${choice.qualifier}#rules`, label: 'Qualifier rules →' },
          switchTo: ownFoundation,
        };
    }
  }

  if (tool === 'qualifier' && choice.qualifier && id && id !== choice.qualifier) {
    const other = getQualifier(id);
    if (!other) return undefined;
    return {
      text: `This is the ${other.title}. You’re preparing for ${mine}.`,
      switchTo: qualifierChoiceId(other.id),
      link: { href: `${QUALIFIER_PATH}/${choice.qualifier}`, label: 'Go to my qualifier' },
    };
  }

  if (SUBJECT_PAGES.has(section) && id && subjectName.has(id)) {
    const name = subjectName.get(id);
    if (!inChoice(choice, id)) {
      return {
        text: `${name} isn’t part of ${mine}.`,
        switchTo: choiceWithSubject(id, choice.programme)?.id,
        link: { href: '/library', label: 'Back to my library' },
      };
    }
    const week = Number(rest);
    if (choice.weeks && Number.isInteger(week) && !inChoice(choice, id, week)) {
      return {
        text: `The qualifier covers weeks 1–${choice.weeks} of ${name}; this is week ${week}, which comes after admission.`,
        link: { href: `/${section}/${id}/1`, label: `${name} week 1 →` },
      };
    }
  }
  return undefined;
}
