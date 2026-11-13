import { Fragment, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Grid3x3, PieChart as PieIcon, Radar as RadarIcon, TrendingUp } from 'lucide-react';
import { useView, usePalette, useTooltipStyle } from '../hooks';
import { downtimeByCause, downtimeHeat, leversActive, NO_LEVERS, shiftProfile, trendSeries } from '../engine';
import { SHIFTS } from '../data/dataset';
import { inr, p1 } from '../format';
import { Section } from './ui';

const CAUSE: Record<string, string> = { changeover: 'Changeover', breakdown: 'Breakdown', maintenance: 'Maintenance', material: 'Material', jam: 'Jam', 'glue-temp': 'Glue temp' };

export default function Analytics() {
  const { f, l, sim } = useView();
  const pal = usePalette();
  const tt = useTooltipStyle();
  const lv = leversActive(l) ? l : NO_LEVERS;

  const trend = useMemo(() => trendSeries(f, lv).map((d) => ({ ...d, label: format(parseISO(d.date), 'dd MMM') })), [f, lv]);
  const radar = useMemo(() => shiftProfile(f, lv), [f, lv]);
  const causes = downtimeByCause(sim);
  const heat = downtimeHeat(sim);
  const totalMin = causes.reduce((a, c) => a + c.minutes, 0);
  const colors = [pal.accent, pal.crit, pal.warn, pal.ok, '#22D3EE', '#F472B6'];
  const shiftColor = { A: pal.accent, B: '#22D3EE', C: '#F472B6' };
  const tick = { fill: pal.mute, fontSize: 11 };
  const selLabel = format(parseISO(f.date), 'dd MMM');

  return (
    <>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Section icon={<TrendingUp size={16} />} delay={340} className="h-full" title="7-day trend" sub="OEE (line) against net margin leakage (bars). The selected day is marked; grade and shift filters apply.">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bar-leak" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={pal.crit} stopOpacity={0.75} /><stop offset="100%" stopColor={pal.crit} stopOpacity={0.12} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke={pal.line} strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="l" tick={tick} axisLine={false} tickLine={false} domain={[(min: number) => Math.floor(min - 3), (max: number) => Math.ceil(max + 3)]} tickFormatter={(v) => `${v}%`} width={48} />
                  <YAxis yAxisId="r" orientation="right" tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} width={52} />
                  <Tooltip {...tt} cursor={{ fill: pal.accent, fillOpacity: 0.06 }} formatter={(v: number, n: string) => (n === 'OEE' ? p1(v) : inr(v))} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: pal.mute }} />
                  <ReferenceLine yAxisId="l" x={selLabel} stroke={pal.accent} strokeDasharray="4 4" strokeOpacity={0.7} />
                  <Bar yAxisId="r" dataKey="leak" name="Margin leakage" fill="url(#bar-leak)" radius={[8, 8, 0, 0]} maxBarSize={38} />
                  <Line yAxisId="l" type="monotone" dataKey="oee" name="OEE" stroke={pal.accent} strokeWidth={3} dot={{ r: 4, fill: pal.surface, stroke: pal.accent, strokeWidth: 2 }} activeDot={{ r: 6 }} style={{ filter: `drop-shadow(0 4px 8px ${pal.accent}88)` }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        <div className="xl:col-span-5">
          <Section icon={<PieIcon size={16} />} delay={400} className="h-full" title="Downtime by cause" sub="Share of stopped minutes in the current view.">
            {totalMin > 0 ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative h-52 w-52 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip {...tt} formatter={(v: number, n: string) => [`${v.toFixed(0)} min`, CAUSE[n] ?? n]} />
                      <Pie data={causes} dataKey="minutes" nameKey="cause" innerRadius={64} outerRadius={92} paddingAngle={3} cornerRadius={6} stroke="none">
                        {causes.map((c, i) => <Cell key={c.cause} fill={colors[i % colors.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="font-display text-2xl font-extrabold leading-none">{totalMin.toFixed(0)}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-mute">min stopped</div>
                  </div>
                </div>
                <ul className="w-full flex-1 space-y-2 text-xs">
                  {causes.map((c, i) => (
                    <li key={c.cause}>
                      <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />{CAUSE[c.cause] ?? c.cause}</span><b>{c.minutes.toFixed(0)} min · {p1(c.share)}</b></div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full" style={{ width: `${c.share}%`, background: colors[i % colors.length] }} /></div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <p className="py-16 text-center text-xs text-mute">No downtime recorded in this view.</p>}
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <Section icon={<RadarIcon size={16} />} delay={460} className="h-full" title="Shift fingerprint" sub="OEE components and yield per shift (%). Wider shape = stronger shift.">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="72%">
                  <PolarGrid stroke={pal.line} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: pal.mute, fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[60, 100]} tick={false} axisLine={false} />
                  <Tooltip {...tt} formatter={(v: number) => p1(v)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: pal.mute }} />
                  {SHIFTS.map((s) => (
                    <Radar key={s.id} name={`Shift ${s.id}`} dataKey={s.id} stroke={shiftColor[s.id]} fill={shiftColor[s.id]} fillOpacity={0.14} strokeWidth={2} />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        <div className="xl:col-span-8">
          <Section icon={<Grid3x3 size={16} />} delay={520} className="h-full" title="Downtime heatmap" sub="Stopped minutes by machine and hour of the plant day (06:00 → 05:00). Darker = more downtime.">
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[620px]">
                <div className="grid items-center gap-[3px]" style={{ gridTemplateColumns: '116px repeat(24, minmax(0, 1fr))' }}>
                  <div />
                  {heat.hours.map((h) => <div key={h} className="text-center text-[9px] text-mute">{(h - 6 + 24) % 24 % 3 === 0 ? String(h).padStart(2, '0') : ''}</div>)}
                  {heat.rows.map((r) => (
                    <Fragment key={r.id}>
                      <div className="truncate pr-2 text-[11px] font-medium">{r.name}</div>
                      {r.cells.map((v, i) => (
                        <div key={i} title={`${r.name} · ${String(heat.hours[i]).padStart(2, '0')}:00 · ${v.toFixed(0)} min`} className="h-8 rounded-md transition-transform hover:scale-110"
                          style={{ background: v > 0 ? `rgb(var(--crit) / ${0.18 + (0.82 * v) / (heat.max || 1)})` : 'rgb(var(--line) / .45)', boxShadow: v > 0 && v === heat.max ? '0 0 14px rgb(var(--crit) / .7)' : undefined }} />
                      ))}
                    </Fragment>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-mute">
                  <span>0 min</span><div className="h-1.5 w-28 rounded-full" style={{ background: 'linear-gradient(90deg, rgb(var(--crit) / .18), rgb(var(--crit)))' }} /><span>{heat.max.toFixed(0)} min</span>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
