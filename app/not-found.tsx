import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card empty max-form">
      <div className="empty-icon">?</div>
      <h1 className="mb-sm">Page not found</h1>
      <p>This page doesn’t exist or has moved. Pick up where you left off from the Study Library.</p>
      <div className="btn-group mt-lg">
        <Link className="btn btn-primary" href="/library">Study Library</Link>
        <Link className="btn btn-secondary" href="/">Overview</Link>
      </div>
    </div>
  );
}
