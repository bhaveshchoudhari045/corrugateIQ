import { useView, usePalette } from '../hooks';
import { useStore } from '../store';
import { WASTE_INFO } from '../data/dataset';
import { p1, t2 } from '../format';
import { Workflow } from 'lucide-react';
import { Section } from './ui';

export default function YieldFlow() {
  const { sim } = useView();
  const pal = usePalette();
  const sel = useStore((s) => s.wasteSel);
  const setSel = useStore((s) => s.setWasteSel);
  const m = sim.m;
  const items = [
    { id: 'good' as const, label: 'Good Boards', v: m.goodT, c: pal.ok },
    { id: 'trim' as const, label: 'Side-Trim Waste', v: m.trimT, c: pal.warn },
    { id: 'reject' as const, label: 'Wet-End Warp & Splicing Rejects', v: m.rejectT, c: pal.crit },
    { id: 'diecut' as const, label: 'Die-Cut & Slotting Scrap', v: m.dieCutT, c: pal.mute },
  ];
  const W = 760, TOP = 28, H = 210, GAP = 20, LX = 0, LW = 14, RX = 430, RW = 14;
  const k1 = m.inputT > 0 ? H / m.inputT : 0;
  const k2 = m.inputT > 0 ? (H - GAP * 3) / m.inputT : 0;
  let ly = TOP, ry = TOP;
  const mid = (LX + LW + RX) / 2;
  const shapes = items.map((it) => {
    const t0 = Math.max(2, it.v * k1), t1 = Math.max(4, it.v * k2);
    const s = { ...it, y0: ly, t0, y1: ry, t1 };
    ly += it.v * k1; ry += t1 + GAP;
    return s;
  });
  const info = sel ? WASTE_INFO[sel] : null;
  const selItem = items.find((i) => i.id === sel);
  const pctOf = (v: number) => (m.inputT > 0 ? (v / m.inputT) * 100 : 0);

  return (
    <Section icon={<Workflow size={16} />} delay={300} title="Where did our paper go?" sub="Raw kraft paper input → good boards and waste categories. Click a category for detail." className="h-full">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[['Material yield', p1(m.yieldPct)], ['Total waste', p1(m.scrapPct)], ['Side-trim', p1(m.trimPct)], ['Rejects', p1(m.rejectPct)], ['Die-cut scrap', p1(m.dieCutPct)]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-bg/60 px-3 py-2"><div className="text-[10px] text-mute">{l}</div><div className="font-display text-base font-extrabold">{v}</div></div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${TOP + H + 10}`} className="w-full" role="img" aria-label="Material flow">
        <defs>
          <linearGradient id="yf-in" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient>
          {items.map((it) => (
            <linearGradient key={it.id} id={`yf-${it.id}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={it.c} stopOpacity={0.12} /><stop offset="100%" stopColor={it.c} stopOpacity={0.6} /></linearGradient>
          ))}
        </defs>
        <text x={0} y={14} className="fill-mute" fontSize="10" fontWeight="600">RAW KRAFT PAPER INPUT</text>
        <text x={150} y={14} className="fill-ink" fontSize="12" fontWeight="700">{m.inputT.toFixed(1)} t</text>
        <rect x={LX} y={TOP} width={LW} height={H} fill="url(#yf-in)" rx={7} />
        {shapes.map((s) => {
          const dim = sel && sel !== s.id;
          const d = `M${LX + LW},${s.y0} C${mid},${s.y0} ${mid},${s.y1} ${RX},${s.y1} L${RX},${s.y1 + s.t1} C${mid},${s.y1 + s.t1} ${mid},${s.y0 + s.t0} ${LX + LW},${s.y0 + s.t0} Z`;
          return (
            <g key={s.id} onClick={() => setSel(s.id)} style={{ cursor: 'pointer', transition: 'opacity .2s' }} opacity={dim ? 0.3 : 1}>
              <path d={d} fill={`url(#yf-${s.id})`} fillOpacity={sel === s.id ? 1 : 0.8} stroke={s.c} strokeOpacity={sel === s.id ? 0.7 : 0.15} />
              <rect x={RX} y={s.y1} width={RW} height={s.t1} fill={s.c} rx={7} />
              <text x={RX + RW + 10} y={s.y1 + s.t1 / 2 - 2} className="fill-ink" fontSize="11" fontWeight={sel === s.id ? 700 : 500}>{s.label}</text>
              <text x={RX + RW + 10} y={s.y1 + s.t1 / 2 + 11} className="fill-mute" fontSize="10">{t2(s.v)} · {p1(pctOf(s.v))}</text>
            </g>
          );
        })}
      </svg>
      {info && selItem ? (
        <div className="mt-3 rounded-xl border border-line bg-bg/50 p-4 text-xs" style={{ borderLeft: `3px solid ${selItem.c}` }}>
          <div className="mb-1 flex items-center justify-between"><b className="text-sm">{info.label}</b><b>{t2(selItem.v)} · {p1(pctOf(selItem.v))} of input</b></div>
          <div className="grid gap-1 sm:grid-cols-3">
            <div><div className="text-mute">Production stage</div>{info.stage}</div>
            <div><div className="text-mute">Responsible machine / process</div>{info.machine}</div>
            <div><div className="text-mute">Potential corrective action</div>{info.action}</div>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-mute">Good + all scrap categories = raw input ({m.goodT.toFixed(2)} + {m.scrapT.toFixed(2)} = {m.inputT.toFixed(2)} t).</p>
      )}
    </Section>
  );
}
