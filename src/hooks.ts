import { useMemo } from 'react';
import { useStore } from './store';
import { computeScope, leversActive, NO_LEVERS } from './engine';

/** base = filtered data without simulation; sim = same filters with applied what-if levers (== base when none). */
export function useView() {
  const f = useStore((s) => s.filters);
  const l = useStore((s) => s.levers);
  return useMemo(() => {
    const base = computeScope(f, NO_LEVERS);
    const active = leversActive(l);
    return { f, l, base, sim: active ? computeScope(f, l) : base, active };
  }, [f, l]);
}

export function usePalette() {
  const t = useStore((s) => s.theme);
  return t === 'dark'
    ? { ok: '#34D399', warn: '#FBBF24', crit: '#F87171', ink: '#F1F4FC', mute: '#8A94B0', line: '#242A40', surface: '#0F1320', accent: '#818CF8' }
    : { ok: '#059669', warn: '#D97706', crit: '#E11D48', ink: '#0F1428', mute: '#646E8A', line: '#E2E6F2', surface: '#FFFFFF', accent: '#4F46E5' };
}

export function useTooltipStyle() {
  const p = usePalette();
  return { contentStyle: { background: p.surface, border: `1px solid ${p.line}`, fontSize: 12, color: p.ink, borderRadius: 12, boxShadow: '0 12px 32px -12px rgba(0,0,0,.45)' }, labelStyle: { color: p.mute } };
}
