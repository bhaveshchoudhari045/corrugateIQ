import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useStore } from '../store';
import { usePalette, useTooltipStyle, useView } from '../hooks';
import {
  ASSUMPTIONS, buildAlerts, computeScope, leversActive, machineHourly, machineStats, queueData, thermalSeries, NO_LEVERS,
} from '../engine';
import { inr, n0, p1, t2 } from '../format';
import { Badge } from './ui';
import type { Tone } from './ui';
import type { Levers } from '../types';

function Drawer({ title, sub, children, wide }: { title: string; sub?: string; children: ReactNode; wide?: boolean }) {
  const close = useStore((s) => s.closeDrawer);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [close]);
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
      <aside className={`absolute right-0 top-0 h-full w-full overflow-y-auto drawer-in border-l border-line bg-surface shadow-2xl ${wide ? 'sm:w-[560px]' : 'sm:w-[480px]'}`}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-surface p-4">
          <div><h2 className="font-display text-base font-bold tracking-tight">{title}</h2>{sub && <p className="mt-0.5 text-xs text-mute">{sub}</p>}</div>
          <button className="btn" onClick={close} aria-label="Close"><X size={14} /></button>
        </div>
        <div className="space-y-4 p-4">{children}</div>
      </aside>
    </div>
  );
}

const Stat = ({ l, v }: { l: string; v: string }) => (
  <div className="rounded-xl border border-line p-2"><div className="text-[10px] text-mute">{l}</div><div className="text-sm font-bold">{v}</div></div>
);
const H = ({ children }: { children: ReactNode }) => <h3 className="label mb-1.5">{children}</h3>;
const TONE: Record<string, Tone> = { Running: 'ok', Idle: 'warn', Stopped: 'crit', Maintenance: 'warn' };

function MachineDrawer({ id }: { id: string }) {
  const { sim, base } = useView();
  const pal = usePalette();
  const tt = useTooltipStyle();
  const st = machineStats(sim).find((s) => s.id === id)!;
  const data = machineHourly(st, sim);
  const issues = buildAlerts(base).filter((a) => a.active && ((a.id === 'flexo' && id === 'flexo') || (a.id === 'warp' && id === 'facer') || (a.id === 'trim' && id === 'slitter')));
  return (
    <Drawer title={st.name} sub={st.stage}>
      <div className="flex items-center gap-2"><Badge tone={TONE[st.status]}>{st.status}</Badge>{st.isBottleneck && <Badge tone="crit">Bottleneck</Badge>}</div>
      <div className="grid grid-cols-2 gap-2">
        <Stat l="Current speed" v={`${st.speed.toFixed(0)} m/min`} /><Stat l="Planned speed" v={`${st.plannedSpeed} m/min`} />
        <Stat l="Downtime" v={`${st.downtimeMin.toFixed(0)} min`} /><Stat l="WIP waiting" v={`${n0(st.wip)} sheets`} />
      </div>
      <div>
        <H>Hourly speed trend (m/min) — simulated profile</H>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke={pal.line} strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: pal.mute }} stroke={pal.line} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: pal.mute }} stroke={pal.line} domain={[0, 'auto']} />
              <Tooltip {...tt} />
              <Line type="monotone" dataKey="planned" stroke={pal.mute} strokeDasharray="4 3" dot={false} name="Planned" />
              <Line type="monotone" dataKey="speed" stroke={pal.accent} strokeWidth={2} dot={false} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <H>Downtime history</H>
        {st.events.length === 0 ? <p className="text-xs text-mute">No downtime events in this view.</p> : (
          <table className="w-full text-xs"><tbody>
            {st.events.map((e) => (
              <tr key={e.id} className="border-b border-line/60"><td className="py-1.5">{String(e.hour).padStart(2, '0')}:00</td><td>Shift {e.shift} · {e.grade}</td><td className="capitalize">{e.cause.replace('-', ' ')}</td><td className="text-right font-semibold">{e.minutes.toFixed(0)} min</td></tr>
            ))}
          </tbody></table>
        )}
      </div>
      <div>
        <H>WIP information</H>
        <p className="text-xs">{n0(st.wip)} sheets accumulate before this stage ({st.downtimeMin.toFixed(0)} stopped min × {ASSUMPTIONS.sheetsPerMin} sheets/min assumption).</p>
      </div>
      <div>
        <H>Associated production issues</H>
        {issues.length ? issues.map((a) => <div key={a.id} className="mb-1 rounded-xl border border-line p-2 text-xs"><b>{a.title}</b> — {a.impact}</div>) : <p className="text-xs text-mute">No active issue linked to this machine.</p>}
      </div>
      <div>
        <H>Suggested action (illustrative)</H>
        <p className="text-xs">{st.suggestion}</p>
      </div>
    </Drawer>
  );
}

function ThermalDrawer() {
  const { base } = useView();
  const pal = usePalette();
  const tt = useTooltipStyle();
  const { rows, maxDrop } = thermalSeries(base);
  const ax = { tick: { fontSize: 10, fill: pal.mute }, stroke: pal.line };
  return (
    <Drawer title="Glue temperature trend" sub="Simulated hourly profile derived from demo line speeds" wide>
      <div className="rounded-xl border border-warn/40 bg-warn/10 p-2 text-xs text-warn">Illustrative only. Speed or temperature changes are suggestions requiring supervisor validation — not universally safe settings.</div>
      <div className="grid grid-cols-3 gap-2"><Stat l="Max glue-temp drop" v={`${maxDrop.toFixed(1)} °C`} /><Stat l="Setpoint" v="180 °C" /><Stat l="Peak defect rate" v={p1(Math.max(...rows.map((r) => r.defectPct)))} /></div>
      <div>
        <H>Glue temperature (°C) vs line speed (m/min)</H>
        <div className="h-56"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <CartesianGrid stroke={pal.line} strokeDasharray="3 3" />
            <XAxis dataKey="hour" {...ax} interval="preserveStartEnd" />
            <YAxis yAxisId="l" {...ax} domain={[160, 185]} /><YAxis yAxisId="r" orientation="right" {...ax} domain={[210, 255]} />
            <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="l" dataKey="glueTemp" name="Glue temp °C" stroke={pal.crit} strokeWidth={2} dot={false} />
            <Line yAxisId="r" dataKey="speed" name="Speed m/min" stroke={pal.accent} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer></div>
      </div>
      <div>
        <H>Delamination / warp defect rate (%)</H>
        <div className="h-40"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid stroke={pal.line} strokeDasharray="3 3" />
            <XAxis dataKey="hour" {...ax} interval="preserveStartEnd" /><YAxis {...ax} />
            <Tooltip {...tt} /><Bar dataKey="defectPct" name="Defect %" fill={pal.warn} />
          </BarChart>
        </ResponsiveContainer></div>
      </div>
      <p className="text-xs text-mute">Relationship (simulated): glue temperature falls ~0.45 °C per m/min above 220 m/min; defect rate rises with the temperature drop. Review stability and validated operating settings with the supervisor.</p>
    </Drawer>
  );
}

function QueueDrawer() {
  const { base } = useView();
  const q = queueData(base);
  const th = ASSUMPTIONS.targetChangeoverMin;
  return (
    <Drawer title="Flexo printer job queue" sub="Current sequence vs suggested revised sequence" wide>
      <div className="grid grid-cols-3 gap-2"><Stat l="WIP backlog" v={`${n0(q.wip)} sheets`} /><Stat l="Pending jobs" v={String(q.jobs.length)} /><Stat l="Target changeover" v={`${th} min`} /></div>
      <div>
        <H>Current job sequence</H>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-line text-left text-[10px] uppercase text-mute"><th className="py-1">#</th><th>Customer</th><th>Colours</th><th>Plates</th><th>Sheets</th><th className="text-right">Changeover</th></tr></thead>
          <tbody>
            {q.jobs.map((j, i) => (
              <tr key={j.id} className="border-b border-line/60">
                <td className="py-1.5">{i + 1}</td><td>{j.customer}</td><td>{j.colors}</td><td>{j.platesStaged ? 'Staged' : <span className="text-warn">Not staged</span>}</td><td>{n0(j.sheets)}</td>
                <td className={`text-right font-semibold ${j.measured && j.measured > th ? 'text-crit' : ''}`}>{j.measured ? `${j.measured.toFixed(0)} min` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-[11px] text-mute">Changeover column = measured demo downtime events. Model estimate for sequence: {q.currentEst.toFixed(0)} min.</p>
      </div>
      <div>
        <H>Suggested revised sequence (plates pre-staged, ordered by ink colours)</H>
        <ol className="space-y-1 text-xs">
          {q.suggested.map((j, i) => <li key={j.id} className="flex justify-between rounded-xl border border-line px-2 py-1"><span>{i + 1}. {j.customer}</span><span className="text-mute">{j.colors} colours · {n0(j.sheets)} sheets</span></li>)}
        </ol>
        <p className="mt-2 text-xs"><b>Model estimate:</b> {q.suggestedEst.toFixed(0)} min total changeover vs {q.currentEst.toFixed(0)} min current ({Math.max(0, q.currentEst - q.suggestedEst).toFixed(0)} min saved). Calculated estimate (6 min base + 3 min per colour change + 10 min if plates not staged) — suggestion only, requires planner validation against due dates.</p>
      </div>
    </Drawer>
  );
}

function WhatIfDrawer() {
  const { f, base, l } = useView();
  const { setLevers, resetLevers, closeDrawer } = useStore();
  const [d, setD] = useState<Levers>(l);
  const prev = useMemo(() => computeScope(f, d), [f, d]);
  const b = base.m, a = prev.m;
  const sliders: [keyof Levers, string, number][] = [
    ['trimRed', 'Reduce side-trim waste', 100], ['downtimeRed', 'Reduce machine downtime', 100],
    ['speedImp', 'Improve production speed (capped at ideal speed)', 20], ['rejectRed', 'Reduce rejection rate', 100],
  ];
  const rows: [string, string, string][] = [
    ['Good production', t2(b.goodT), t2(a.goodT)], ['Waste quantity', t2(b.scrapT), t2(a.scrapT)],
    ['Material yield', p1(b.yieldPct), p1(a.yieldPct)], ['Downtime', `${b.downtimeMin.toFixed(0)} min`, `${a.downtimeMin.toFixed(0)} min`],
    ['OEE', p1(b.oee), p1(a.oee)], ['Estimated margin leakage', inr(b.leakage), inr(a.leakage)],
  ];
  const savings = b.leakage - a.leakage;
  return (
    <Drawer title="What-if profit recovery simulator" sub="Simulated projections — not actual savings" wide>
      <div className="rounded-xl border border-warn/40 bg-warn/10 p-2 text-xs text-warn">Projections use the explicit assumptions below and recalculate the underlying records. They are not measured results.</div>
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={d.batchFix} onChange={(e) => setD({ ...d, batchFix: e.target.checked })} /> Batch fix: bring over-trimmed batches (&gt;{ASSUMPTIONS.trimAlertPct}%) to {ASSUMPTIONS.targetTrimPct}% trim</label>
        {sliders.map(([k, label, max]) => (
          <div key={k}>
            <div className="flex justify-between text-xs"><span>{label}</span><b>{Math.round((d[k] as number) * 100)}%</b></div>
            <input type="range" min={0} max={max} value={Math.round((d[k] as number) * 100)} onChange={(e) => setD({ ...d, [k]: Number(e.target.value) / 100 })} className="w-full" />
          </div>
        ))}
      </div>
      <div>
        <H>Before vs after (current filters)</H>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-line text-left text-[10px] uppercase text-mute"><th className="py-1">Metric</th><th className="text-right">Before</th><th className="text-right">After (sim)</th></tr></thead>
          <tbody>
            {rows.map(([k, x, y]) => <tr key={k} className="border-b border-line/60"><td className="py-1.5">{k}</td><td className="text-right">{x}</td><td className="text-right font-semibold">{y}</td></tr>)}
            <tr><td className="py-2 font-bold">Estimated savings</td><td /><td className={`text-right font-bold ${savings >= 0 ? 'text-ok' : 'text-crit'}`}>{inr(savings)} (simulated)</td></tr>
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => { setLevers(d); closeDrawer(); }}>Apply simulation</button>
        <button className="btn" onClick={() => { resetLevers(); setD(NO_LEVERS); }}>Reset simulation</button>
      </div>
      <div className="rounded-xl border border-line p-2 text-[11px] text-mute">
        <b className="text-ink">Assumptions:</b> Revenue ₹{ASSUMPTIONS.revenuePerTon.toLocaleString('en-IN')}/t − production cost ₹{ASSUMPTIONS.variableCostPerTon.toLocaleString('en-IN')}/t = contribution margin ₹{ASSUMPTIONS.contributionMarginPerTon.toLocaleString('en-IN')}/t. Net paper loss ₹{ASSUMPTIONS.netPaperLossPerTon.toFixed(0)}/t of scrap. Ideal throughput {(ASSUMPTIONS.idealTonsPerMin * 60).toFixed(1)} t/h. Recovered downtime and higher speed add throughput (scrap scales with it). {leversActive(l) ? 'A simulation is currently applied to the dashboard.' : ''}
      </div>
    </Drawer>
  );
}

export default function DrawerHost() {
  const drawer = useStore((s) => s.drawer);
  if (!drawer) return null;
  if (drawer.kind === 'machine') return <MachineDrawer id={drawer.id} />;
  if (drawer.kind === 'thermal') return <ThermalDrawer />;
  if (drawer.kind === 'queue') return <QueueDrawer />;
  return <WhatIfDrawer key="whatif" />;
}
