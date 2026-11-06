import { RAW } from '@/lib/tokens';

/** The logo mark full-bleed (Android and iOS round the corners themselves). */
export function AppIcon({ size }: { size: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${RAW['color-brand-gradient-start']}, ${RAW['color-brand-gradient-end']})`,
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="150 128 212 256">
        <path d="M150 384V128h52l112 168V128h48v256h-52L198 216v168z" fill={RAW['color-text-inverse']} />
      </svg>
    </div>
  );
}
