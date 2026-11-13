import { AlertTriangle, ArrowRight, Flame, Gauge, RotateCcw, Lightbulb } from 'lucide-react';
import { useView } from '../hooks';
import { useStore } from '../store';
import { buildAlerts } from '../engine';
import { inr, p1, t2 } from '../format';
import { Badge, Section } from './ui';
import type { Tone } from './ui';
import type { Alert } from '../types';

const SEV: Record<Alert['severity'], { tone: Tone; icon: JSX.Element }> = {
  Critical: { tone: 'crit', icon: <Flame size={14} /> },
  Warning: { tone: 'warn', icon: <AlertTriangle size={14} /> },
  Bottleneck: { tone: 'warn', icon: <Gauge size={14} /> },
};

export default function LossFeed() {
  const { base, sim, l } = useView();
  const { openDrawer, setLevers, resetLevers } = useStore();
  const alerts = buildAlerts(base);

  return (
    <Section
      icon={<Lightbulb size={16} />}
      delay={480}
      title="Problem → Root cause → Action"
      sub="Prioritised decision feed built from the same dataset. Evidence is tagged Measured (demo data) or Calculated (estimate); actions are suggestions."
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {alerts.map((a) => {
          const sv = SEV[a.severity];
          const fixed = a.id === 'trim' && l.batchFix;
          return (
            <article key={a.id} className={`relative flex flex-col overflow-hidden rounded-2xl border bg-bg/40 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${a.active ? 'border-line' : 'border-line opacity-70'}`}>
              {a.active && <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, rgb(var(--${sv.tone})), transparent)` }} />}
              <div className="mb-2 flex items-center justify-between">
                <Badge tone={a.active ? sv.tone : 'ok'}><span className="mr-1 inline-flex">{sv.icon}</span>{a.active ? a.severity : 'Within target'}</Badge>
                <span className="font-display text-sm font-extrabold">{a.impact}</span>
              </div>
              <h3 className="font-display text-[15px] font-bold tracking-tight">{a.title}</h3>
              <div className="mb-2 text-[11px] text-mute">Affected: {a.affected}</div>
              <dl className="space-y-3 text-xs leading-relaxed">
                <div><dt className="label">Problem</dt><dd>{a.problem}</dd></div>
                <div><dt className="label">Root cause</dt><dd>{a.rootCause}</dd></div>
                <div><dt className="label">Recommended action <span className="normal-case text-mute">(suggestion)</span></dt><dd>{a.action}</dd></div>
                <div>
                  <dt className="label">Supporting evidence</dt>
                  <dd className="space-y-1">
                    {a.evidence.map((e, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase ${e.kind === 'measured' ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'}`}>{e.kind === 'measured' ? 'Measured' : 'Calc'}</span>
                        <span>{e.text}</span>
                      </div>
                    ))}
                  </dd>
                </div>
              </dl>

              {fixed && (
                <div className="mt-3 rounded-xl border border-ok/30 bg-ok/5 p-3 text-xs">
                  <div className="mb-1 font-semibold text-ok">Simulated batch fix — before vs after</div>
                  <table className="w-full">
                    <tbody>
                      {[
                        ['Side-trim', t2(base.m.trimT), t2(sim.m.trimT)],
                        ['Side-trim %', p1(base.m.trimPct), p1(sim.m.trimPct)],
                        ['Material yield', p1(base.m.yieldPct), p1(sim.m.yieldPct)],
                        ['Scrap %', p1(base.m.scrapPct), p1(sim.m.scrapPct)],
                        ['Paper scrap loss', inr(base.m.scrapLoss), inr(sim.m.scrapLoss)],
                        ['Good boards', t2(base.m.goodT), t2(sim.m.goodT)],
                      ].map(([k, b, s]) => (
                        <tr key={k}><td className="py-0.5 text-mute">{k}</td><td className="text-right">{b}</td><td className="px-1 text-center text-mute"><ArrowRight size={10} /></td><td className="text-right font-semibold">{s}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-1 text-[10px] text-mute">Simulated projection — not actual savings. Dataset recalculated; KPIs and charts above reflect it.</p>
                </div>
              )}

              <div className="mt-auto flex gap-2 pt-3">
                {a.id === 'trim' && (fixed ? (
                  <button className="btn" onClick={resetLevers}><RotateCcw size={12} /> Reset simulation</button>
                ) : (
                  <button className="btn-primary disabled:opacity-40" disabled={!a.active} onClick={() => setLevers({ ...l, batchFix: true })}>{a.button}</button>
                ))}
                {a.id === 'warp' && <button className="btn-primary" onClick={() => openDrawer({ kind: 'thermal' })}>{a.button}</button>}
                {a.id === 'flexo' && <button className="btn-primary" onClick={() => openDrawer({ kind: 'queue' })}>{a.button}</button>}
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
