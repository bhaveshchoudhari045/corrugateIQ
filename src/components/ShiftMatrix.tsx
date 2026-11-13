import { CheckCircle2, RotateCcw, Users } from 'lucide-react';
import { useView } from '../hooks';
import { useStore } from '../store';
import { computeScope, NO_LEVERS, leversActive } from '../engine';
import { SHIFTS } from '../data/dataset';
import { p1, t2 } from '../format';
import { Badge, Section, toneBg } from './ui';
import type { Tone } from './ui';

export default function ShiftMatrix() {
  const { f, l } = useView();
  const { setFilter, resetFilters } = useStore();
  const lv = leversActive(l) ? l : NO_LEVERS;
  const rows = SHIFTS.map((s) => ({ s, m: computeScope({ ...f, shift: s.id }, lv).m }));
  const total = computeScope({ ...f, shift: 'All' }, lv).m;
  const ok = Math.abs(rows.reduce((a, r) => a + r.m.goodT, 0) - total.goodT) < 1e-6;
  const status = (o: number): { t: string; tone: Tone } => (o >= 80 ? { t: 'On target', tone: 'ok' } : o >= 75 ? { t: 'Watch', tone: 'warn' } : { t: 'Critical', tone: 'crit' });
  const cls = (v: number, w: number, c: number) => (v > c ? 'text-crit font-semibold' : v > w ? 'text-warn font-semibold' : '');

  return (
    <Section
      icon={<Users size={16} />}
      delay={360}
      title="Shift performance"
      sub="Click a shift to filter the entire dashboard."
      right={f.shift !== 'All' ? <button className="btn" onClick={() => setFilter({ shift: 'All' })}><RotateCcw size={12} /> All shifts</button> : undefined}
      className="h-full"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-mute">
              <th className="py-1.5 pr-2">Shift</th><th className="pr-2">Good (t)</th><th className="pr-2">Scrap</th><th className="pr-2">Downtime</th><th className="pr-2">Speed</th><th className="pr-2">OEE</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, m }) => {
              const st = status(m.oee);
              const selected = f.shift === s.id;
              return (
                <tr key={s.id} onClick={() => setFilter({ shift: selected ? 'All' : s.id })} className={`cursor-pointer border-b border-line/50 transition-colors hover:bg-accent/5 ${selected ? 'bg-accent/10 shadow-[inset_3px_0_0_rgb(var(--accent))]' : ''}`}>
                  <td className="py-2 pr-2 font-semibold">{s.label}</td>
                  <td className="pr-2">{m.goodT.toFixed(2)}</td>
                  <td className={`pr-2 ${cls(m.scrapPct, 7, 9)}`}>{p1(m.scrapPct)}</td>
                  <td className={`pr-2 ${cls(m.downtimeMin, 40, 50)}`}>{m.downtimeMin.toFixed(0)} min</td>
                  <td className="pr-2">{(m.operatingMin > 0 ? (m.performance * 250) / 100 : 0).toFixed(0)} m/min</td>
                  <td className="pr-3"><div className="font-semibold">{p1(m.oee)}</div><div className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${toneBg(st.tone)}`} style={{ width: `${Math.min(100, m.oee)}%` }} /></div></td>
                  <td><Badge tone={st.tone}>{st.t}</Badge></td>
                </tr>
              );
            })}
            <tr className="bg-bg/50 font-semibold">
              <td className="rounded-l-lg py-2 pl-1 pr-2">All shifts</td><td className="pr-2">{total.goodT.toFixed(2)}</td><td className="pr-2">{p1(total.scrapPct)}</td>
              <td className="pr-2">{total.downtimeMin.toFixed(0)} min</td><td className="pr-2">{((total.performance * 250) / 100).toFixed(0)} m/min</td><td className="pr-2">{p1(total.oee)}</td><td />
            </tr>
          </tbody>
        </table>
      </div>
      <p className={`mt-2 flex items-center gap-1 text-[11px] ${ok ? 'text-ok' : 'text-crit'}`}>
        <CheckCircle2 size={12} /> {ok ? `Shift totals reconcile with plant total (${t2(total.goodT)} good).` : 'Reconciliation mismatch.'}
      </p>
      <p className="mt-1 text-[11px] text-mute">Status: OEE ≥ 80% on target · 75–80% watch · below 75% critical. Speed = ideal 250 m/min × performance (grade filter applies).</p>
    </Section>
  );
}
