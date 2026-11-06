/**
 * Which pages anyone can open. Everything else needs a login plus an active free
 * trial or Pro (see <AccessGate> in components/access-gate.tsx). The content behind
 * those pages comes from /api/pro/*, which checks the plan again on the server.
 * Shared by the browser and the server.
 */

/** Every subject's first week (notes and practice) is a free preview. */
export const PREVIEW_WEEK = 1;

const OPEN_PAGES = new Set([
  '/', // Overview
  '/login',
  '/pricing',
  '/profile', // so anyone can still change or delete their account
  '/admin', // has its own admin check
  '/privacy',
  '/terms',
  '/grades', // a calculator, not study material
  '/library', // the list of subjects and weeks
  '/practice', // the week picker
  '/flashcards', // the deck list (locked weeks show Unlock)
  '/war', // Quiz War asks for a login itself; questions come from /api/war
]);

export function isOpenPath(pathname: string): boolean {
  if (OPEN_PAGES.has(pathname)) return true;
  // Qualifier Prep is the way in for future students: landing, plan and free mocks (Pro mocks lock inside the page).
  if (pathname === '/qualifier' || pathname.startsWith('/qualifier/')) return true;
  // /library/<subject> only redirects to week 1.
  if (/^\/library\/[^/]+$/.test(pathname)) return true;
  // A Quiz War room, opened from a friend's link.
  if (/^\/war\/[^/]+$/.test(pathname)) return true;
  const week = /^\/(?:library|practice|flashcards)\/[^/]+\/(\d+)$/.exec(pathname);
  return week ? Number(week[1]) === PREVIEW_WEEK : false;
}
