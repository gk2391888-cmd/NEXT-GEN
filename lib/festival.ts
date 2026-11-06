'use client';

import { useEffect, useState } from 'react';

/**
 * A festival greeting on the Overview, shown between startsAt and endsAt (ISO times with offset).
 * To greet students for another festival, change FESTIVAL; set it to null to show none.
 */
export type Festival = {
  /** "Happy Diwali": the heading reads "Happy Diwali, Arjun 🪔". */
  greeting: string;
  emoji: string;
  /** One line under the heading. */
  message: string;
  startsAt: string;
  endsAt: string;
};

export const FESTIVAL: Festival | null = {
  greeting: 'Happy Diwali',
  emoji: '🪔',
  message: 'Wishing you and your family a bright and happy Diwali. May this festival light up your studies too. ✨',
  startsAt: '2026-11-06T00:00:00+05:30',
  endsAt: '2026-11-12T23:59:59+05:30',
};

export function activeFestival(now = Date.now()): Festival | null {
  return FESTIVAL && now >= Date.parse(FESTIVAL.startsAt) && now <= Date.parse(FESTIVAL.endsAt) ? FESTIVAL : null;
}

/** The festival on today, or null. Null until mounted, so the static page and the browser render the same. */
export function useFestival(): Festival | null {
  const [festival, setFestival] = useState<Festival | null>(null);
  useEffect(() => setFestival(activeFestival()), []);
  return festival;
}
