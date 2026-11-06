'use client';

import { useEffect, useRef, useState } from 'react';
import { RAW } from '@/lib/tokens';
import { useProgress } from '@/lib/progress/store';
import { studyStreak } from '@/lib/progress/insights';
import { inviteLink, inviteMessage, whatsappUrl } from '@/lib/referrals';
import { useAuth } from '@/components/auth/auth-provider';
import { useReferrals } from '@/components/referral';

type Result = { correct: number; total: number; title: string };

/** Instagram and WhatsApp's portrait size. */
const W = 1080;
const H = 1350;

/** "Share result ↗" on a mock test result, and the dialog with the image and the ways to share it. */
export function ShareResult(result: Result) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-primary btn-block" onClick={() => setOpen(true)}>Share result ↗</button>
      {open && <ShareDialog {...result} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareDialog({ correct, total, title, onClose }: Result & { onClose: () => void }) {
  const { user } = useAuth();
  const state = useProgress();
  const { data } = useReferrals();
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [canShareFile, setCanShareFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);

  const percent = total ? Math.round((correct / total) * 100) : 0;
  const firstName = (state.profile?.fullName || user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim().split(/\s+/)[0];
  const streak = studyStreak(state.answers);
  const link = data ? inviteLink(data.code) : window.location.origin;
  const text = `I scored ${percent}% in ${title} on NEXT GEN. ${data ? inviteMessage(link) : `Practise for IITM BS free: ${link}`}`;

  useEffect(() => {
    let url = '';
    drawCard({ percent, correct, total, title, name: firstName, streak, site: window.location.host }).then((blob) => {
      if (!blob) return;
      url = URL.createObjectURL(blob);
      setImage(blob);
      setPreview(url);
      const file = new File([blob], 'nextgen-result.png', { type: 'image/png' });
      setCanShareFile(typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }));
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [percent, correct, total, title, firstName, streak]);

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function shareImage() {
    if (!image) return;
    const file = new File([image], 'nextgen-result.png', { type: 'image/png' });
    navigator.share({ files: [file], text }).catch(() => {});
  }

  function download() {
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview;
    a.download = 'nextgen-result.png';
    a.click();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy the link', link);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialog} tabIndex={-1} className="card modal share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className="share-preview">
          {preview ? <img src={preview} alt={`Result card: ${percent}% in ${title}`} /> : <div className="share-placeholder">Making your image…</div>}
        </div>
        <div className="share-actions">
          <h2 id="share-title" className="card-title">Share your result</h2>
          <p className="muted text-small">The image is made on your device. Nothing is posted unless you share it.</p>
          {canShareFile && <button type="button" className="btn btn-primary btn-block" onClick={shareImage} disabled={!image}>Share image (WhatsApp, Instagram…)</button>}
          <a className="btn btn-whatsapp btn-block" href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>
          <button type="button" className="btn btn-secondary btn-block" onClick={download} disabled={!preview}>Download image</button>
          <button type="button" className="btn btn-secondary btn-block" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
          <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- The image ---------------- */

type Card = { percent: number; correct: number; total: number; title: string; name: string; streak: number; site: string };

/** The site's fonts, read from the CSS variables next/font sets. */
function fonts() {
  const css = getComputedStyle(document.documentElement);
  return { heading: css.getPropertyValue('--font-family-heading').trim() || 'sans-serif', body: css.getPropertyValue('--font-family-body').trim() || 'sans-serif' };
}

/** Breaks `text` into lines no wider than `max`, at most `limit` lines (the last ends with …). */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, limit: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= max || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > limit) {
    lines.length = limit;
    lines[limit - 1] = `${lines[limit - 1].replace(/\s+\S*$/, '')}…`;
  }
  return lines;
}

async function drawCard(c: Card): Promise<Blob | null> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const f = fonts();
  const white = RAW['color-text-inverse'];

  // Background: the hero gradient, with a soft glow top right.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, RAW['color-brand-hero-start']);
  bg.addColorStop(0.55, RAW['color-brand-hero-mid']);
  bg.addColorStop(1, RAW['color-brand-hero-end']);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W - 120, 120, 0, W - 120, 120, 520);
  glow.addColorStop(0, RAW['color-brand-gradient-start']);
  glow.addColorStop(1, RAW['color-brand-hero-mid']);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(W - 120, 120, 520, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Brand: the logo tile and the name.
  const logo = ctx.createLinearGradient(80, 80, 160, 160);
  logo.addColorStop(0, RAW['color-brand-gradient-start']);
  logo.addColorStop(1, RAW['color-brand-gradient-end']);
  ctx.fillStyle = logo;
  ctx.beginPath();
  ctx.roundRect(80, 80, 84, 84, 22);
  ctx.fill();
  ctx.fillStyle = white;
  ctx.font = `800 52px ${f.heading}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', 122, 124);
  ctx.textAlign = 'left';
  ctx.font = `800 40px ${f.heading}`;
  ctx.fillText('NEXT GEN', 190, 124);

  // The score ring.
  const cx = W / 2;
  const cy = 520;
  const r = 230;
  ctx.lineWidth = 44;
  ctx.lineCap = 'round';
  ctx.strokeStyle = white;
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (c.percent > 0) {
    ctx.strokeStyle = RAW['color-brand-hero-label'];
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * c.percent) / 100);
    ctx.stroke();
  }
  ctx.fillStyle = white;
  ctx.textAlign = 'center';
  ctx.font = `800 150px ${f.heading}`;
  ctx.fillText(`${c.percent}%`, cx, cy + 6);

  // Who scored what, in which test.
  ctx.font = `800 64px ${f.heading}`;
  ctx.fillText(c.name ? `${c.name} scored ${c.percent}%` : `I scored ${c.percent}%`, cx, 870);
  ctx.font = `500 40px ${f.body}`;
  ctx.fillStyle = RAW['color-text-inverse-muted'];
  wrap(ctx, c.title, W - 200, 2).forEach((line, i) => ctx.fillText(line, cx, 950 + i * 54));

  // Facts as pills.
  const facts = [`${c.correct}/${c.total} correct`, ...(c.streak > 1 ? [`🔥 ${c.streak}-day streak`] : [])];
  ctx.font = `700 36px ${f.body}`;
  const widths = facts.map((t) => ctx.measureText(t).width + 64);
  let x = cx - (widths.reduce((a, b) => a + b, 0) + (facts.length - 1) * 20) / 2;
  facts.forEach((t, i) => {
    ctx.fillStyle = white;
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.roundRect(x, 1080, widths[i], 76, 38);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillText(t, x + widths[i] / 2, 1120);
    x += widths[i] + 20;
  });

  ctx.font = `500 32px ${f.body}`;
  ctx.fillStyle = RAW['color-text-inverse-muted'];
  ctx.fillText(`Practise free for IITM BS · ${c.site}`, cx, H - 80);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
