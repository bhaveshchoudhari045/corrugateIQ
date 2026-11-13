import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Coins, Gauge, PackageCheck, Ruler } from 'lucide-react';
import { useView, usePalette } from '../hooks';
import { dailyLeakage, machineStats, ASSUMPTIONS } from '../engine';
import { inr, p1, t1, t2 } from '../format';
import { AnimatedNumber, Badge, Ring, toneText } from './ui';
import type { Tone } from './ui';

const Card = ({ label, icon, color, delay, children }: { label: string; icon: ReactNode; color: string; delay: number; children: ReactNode }) => (
  <div className="card card-hover rise overflow-hidden p-5" style={{ animationDelay: `${delay}ms` }}>
    <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-25 blur-3xl" style={{ background: color }} />
    <div className="relative mb-3 flex items-center justify-between">
      <span className="label">{label}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}22`, color }}>{icon}</span>
    </div>
    <div className="relative">{children}</div>
  </div>
);
const Big = ({ children }: { children: ReactNode }) => <div className="font-display text-[28px] font-extrabold leading-none tracking-tight">{children}</div>;
const Mini = ({ l, children }: { l: string; children: ReactNode }) => <div className="rounded-lg bg-bg/60 px-2.5 py-1.5"><div className="text-[10px] text-mute">{l}</div><div className="text-xs font-bold">{children}</div></div>;

export default function Kpis() {
  const { sim, f } = useView();
  const pal = usePalette();
  const m = sim.m;
  const daily = useMemo(() => dailyLeakage(f), [f]);
  const others = daily.filter((d) => d.date !== f.date);
  const avg = others.length ? others.reduce((a, d) => a + d.leak, 0) / others.length : 0;
  const delta = avg ? ((m.leakage - avg) / avg) * 100 : 0;
  const bottleneck = machineStats(sim).find((x) => x.isBottleneck);
  const ach: { t: string; tone: Tone } = m.achievement >= 95 ? { t: 'On track', tone: 'ok' } : m.achievement >= 85 ? { t: 'At risk', tone: 'warn' } : { t: 'Behind plan', tone: 'crit' };
  const oeeC: { t: string; tone: Tone } = m.oee >= ASSUMPTIONS.oeeWorldClass ? { t: 'World-class', tone: 'ok' } : m.oee >= 70 ? { t: 'Acceptable — room to improve', tone: 'warn' } : { t: 'Poor', tone: 'crit' };
  const gap = ASSUMPTIONS.targetDeckleUtil - m.deckleUtil;
  const achColor = ach.tone === 'ok' ? pal.ok : ach.tone === 'warn' ? pal.warn : pal.crit;
  const oeeColor = oeeC.tone === 'ok' ? pal.ok : oeeC.tone === 'warn' ? pal.warn : pal.crit;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card label="Net Margin Leakage" icon={<Coins size={16} />} color={pal.crit} delay={60}>
        <Big><AnimatedNumber value={m.leakage} format={inr} /></Big>
        <span className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${delta > 0 ? 'bg-crit/10 text-crit' : 'bg-ok/10 text-ok'}`}>
          {delta > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(delta).toFixed(0)}% vs {others.length}-day avg
        </span>
        <div className="-mx-1 mt-2 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs><linearGradient id="lkg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={pal.crit} stopOpacity={0.45} /><stop offset="100%" stopColor={pal.crit} stopOpacity={0} /></linearGradient></defs>
              <Area type="monotone" dataKey="leak" stroke={pal.crit} fill="url(#lkg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Mini l="Paper scrap loss">{inr(m.scrapLoss)}</Mini>
          <Mini l="Downtime loss">{inr(m.downtimeLoss)}</Mini>
        </div>
        <p className="mt-2.5 text-[11px] leading-snug text-mute">Estimated: {t1(m.scrapT)} scrap × net paper loss + {m.downtimeMin.toFixed(0)} min downtime ({t2(m.lostT)} lost) × contribution margin.</p>
      </Card>

      <Card label="Good Board Output" icon={<PackageCheck size={16} />} color={pal.ok} delay={120}>
        <div className="flex items-end justify-between gap-2">
          <Big><AnimatedNumber value={m.goodT} format={t1} /></Big>
          <Badge tone={ach.tone}>{ach.t}</Badge>
        </div>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-line/70">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, m.achievement)}%`, background: `linear-gradient(90deg, ${achColor}88, ${achColor})`, boxShadow: `0 0 12px ${achColor}77` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs"><span className="text-mute">Plan {t1(m.planT)}</span><b>{p1(m.achievement)} achieved</b></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Mini l="Shortfall vs plan">{t1(Math.max(0, m.planT - m.goodT))}</Mini>
          <Mini l="Material yield">{p1(m.yieldPct)}</Mini>
        </div>
      </Card>

      <Card label="Deckle Paper Utilization" icon={<Ruler size={16} />} color={pal.accent} delay={180}>
        <div className="flex items-end justify-between gap-2">
          <Big><AnimatedNumber value={m.deckleUtil} format={p1} /></Big>
          <span className="text-xs text-mute">Target {p1(ASSUMPTIONS.targetDeckleUtil)}</span>
        </div>
        <div className="relative mt-5 h-2.5 rounded-full bg-line/70">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, m.deckleUtil)}%`, background: `linear-gradient(90deg, #6366f1, #8b5cf6)`, boxShadow: '0 0 12px rgb(139 92 246 / .6)' }} />
          <div className="absolute -top-1 h-[18px] w-0.5 rounded bg-ok" style={{ left: `${ASSUMPTIONS.targetDeckleUtil}%` }} title="Target" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Mini l="Gap to target"><span className={gap > 0 ? 'text-warn' : 'text-ok'}>{gap > 0 ? gap.toFixed(1) + ' pts' : 'Met'}</span></Mini>
          <Mini l="Excess side-trim">{t2(m.excessTrimT)}</Mini>
        </div>
        <p className="mt-2.5 text-[11px] leading-snug text-mute">Usable width proxied by non-trim tonnage. Side-trim {p1(m.trimPct)} of input.</p>
      </Card>

      <Card label="Line OEE Health" icon={<Gauge size={16} />} color={oeeColor} delay={240}>
        <div className="flex items-center gap-4">
          <Ring value={m.oee} color={oeeColor} size={96}>
            <div className="text-center"><div className="font-display text-lg font-extrabold leading-none"><AnimatedNumber value={m.oee} format={p1} /></div><div className="mt-0.5 text-[9px] uppercase tracking-wider text-mute">OEE</div></div>
          </Ring>
          <div className="min-w-0 flex-1 space-y-1.5 text-xs">
            <div className={`text-[11px] font-semibold leading-tight ${toneText(oeeC.tone)}`}>{oeeC.t}</div>
            {[['Availability', m.availability], ['Performance', m.performance], ['Quality', m.quality]].map(([l, v]) => (
              <div key={l as string} className="flex justify-between"><span className="text-mute">{l}</span><b>{p1(v as number)}</b></div>
            ))}
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-bg/60 px-2.5 py-1.5 text-xs"><span className="text-mute">Bottleneck: </span><b>{bottleneck ? `${bottleneck.name} (${bottleneck.downtimeMin.toFixed(0)} min)` : 'None'}</b></div>
      </Card>
    </div>
  );
}
