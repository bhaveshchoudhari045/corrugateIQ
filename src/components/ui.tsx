import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export function Section({ title, sub, right, icon, children, className = '', delay = 0 }: { title: string; sub?: string; right?: ReactNode; icon?: ReactNode; children: ReactNode; className?: string; delay?: number }) {
  return (
    <section className={`card rise p-5 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</span>}
          <div>
            <h2 className="font-display text-[15px] font-bold tracking-tight">{title}</h2>
            {sub && <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-mute">{sub}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

const TONES = {
  ok: 'text-ok bg-ok/10 border-ok/25',
  warn: 'text-warn bg-warn/10 border-warn/25',
  crit: 'text-crit bg-crit/10 border-crit/25',
  mute: 'text-mute bg-mute/10 border-line',
} as const;
export type Tone = keyof typeof TONES;

export const Badge = ({ tone = 'mute', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONES[tone]}`}>{children}</span>
);

export const toneText = (t: Tone) => (t === 'ok' ? 'text-ok' : t === 'warn' ? 'text-warn' : t === 'crit' ? 'text-crit' : 'text-mute');
export const toneBg = (t: Tone) => (t === 'ok' ? 'bg-ok' : t === 'warn' ? 'bg-warn' : t === 'crit' ? 'bg-crit' : 'bg-mute');

/** Smoothly counts from the previous value to the new one. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [v, setV] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(value); from.current = value; return; }
    const start = from.current, t0 = performance.now(), D = 800;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / D);
      const cur = start + (value - start) * (1 - Math.pow(1 - k, 3));
      from.current = cur; setV(cur);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(v)}</>;
}

/** Radial progress gauge. */
export function Ring({ value, color, size = 96, stroke = 9, children }: { value: number; color: string; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`} style={{ transition: 'stroke-dasharray .8s cubic-bezier(.2,.8,.2,1)', filter: `drop-shadow(0 0 6px ${color}88)` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
