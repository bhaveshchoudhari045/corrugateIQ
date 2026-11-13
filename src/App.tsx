import { FlaskConical, RotateCcw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Header from './components/Header';
import Kpis from './components/Kpis';
import YieldFlow from './components/YieldFlow';
import ShiftMatrix from './components/ShiftMatrix';
import Analytics from './components/Analytics';
import Pipeline from './components/Pipeline';
import LossFeed from './components/LossFeed';
import DrawerHost from './components/Drawers';
import { useView } from './hooks';
import { useStore } from './store';
import { ASSUMPTIONS } from './engine';
import { PLANT } from './data/dataset';
import { inr } from './format';

function SimBanner() {
  const { active, base, sim } = useView();
  const reset = useStore((s) => s.resetLevers);
  if (!active) return null;
  return (
    <div className="rise flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs text-warn backdrop-blur" style={{ boxShadow: '0 0 28px -10px rgb(var(--warn) / .6)' }}>
      <span className="flex items-center gap-2"><FlaskConical size={14} /> <b>SIMULATION ACTIVE</b> — all figures are simulated projections, not actuals. Projected leakage {inr(base.m.leakage)} → {inr(sim.m.leakage)}.</span>
      <button className="btn" onClick={reset}><RotateCcw size={12} /> Reset simulation</button>
    </div>
  );
}

function Title() {
  const { f } = useView();
  return (
    <div className="rise">
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-[32px]">Plant <span className="text-gradient">performance</span></h1>
      <p className="mt-1 text-sm text-mute">{PLANT.name} · {format(parseISO(f.date), 'EEEE, dd MMM yyyy')} · {f.shift === 'All' ? 'All shifts' : `Shift ${f.shift}`} · {f.grade === 'All' ? 'All grades' : f.grade}</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 sm:px-6">
        <Title />
        <SimBanner />
        <Kpis />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-7"><YieldFlow /></div>
          <div className="xl:col-span-5"><ShiftMatrix /></div>
        </div>
        <Analytics />
        <Pipeline />
        <LossFeed />
        <footer className="pb-8 pt-2 text-[11px] leading-relaxed text-mute">
          <b>DEMO DATA.</b> All values are simulated from a local dataset; nothing here is live factory telemetry. Financials use explicit assumptions: revenue ₹{ASSUMPTIONS.revenuePerTon.toLocaleString('en-IN')}/t, production cost ₹{ASSUMPTIONS.variableCostPerTon.toLocaleString('en-IN')}/t, contribution margin ₹{ASSUMPTIONS.contributionMarginPerTon.toLocaleString('en-IN')}/t, net paper loss ₹{ASSUMPTIONS.netPaperLossPerTon.toFixed(0)}/t scrap.
        </footer>
      </main>
      <DrawerHost />
    </div>
  );
}
