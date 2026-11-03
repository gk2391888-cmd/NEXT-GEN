'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/** Shown when a page crashes, instead of a blank screen. Progress is safe: it lives in the browser and the account. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card empty max-form" role="alert">
      <div className="empty-icon">!</div>
      <h1 className="mb-sm">Something went wrong</h1>
      <p>This page hit an error. Your progress is saved. Try again, or go back to the Study Library.</p>
      <div className="btn-group mt-lg">
        <button className="btn btn-primary" onClick={reset}>Try again</button>
        <Link className="btn btn-secondary" href="/library">Study Library</Link>
      </div>
    </div>
  );
}
