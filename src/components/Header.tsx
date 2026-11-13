import { Factory, Moon, Sun, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useStore } from '../store';
import { useView } from '../hooks';
import { DATES, PLANT, ASSUMPTIONS } from '../data/dataset';

export default function Header() {
  const { theme, toggleTheme, filters, setFilter, resetFilters, openDrawer } = useStore();
  const { sim, active } = useView();
  const oee = sim.m.oee;
  const status = oee >= ASSUMPTIONS.oeeWorldClass ? { t: 'Optimal', c: 'bg-ok text-ok' } : oee >= 70 ? { t: 'Degraded', c: 'bg-warn text-warn' } : { t: 'Critical', c: 'bg-crit text-crit' };
  const dirty = filters.shift !== 'All' || filters.grade !== 'All' || filters.date !== DATES[0];

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 22px -6px rgb(99 102 241 / .8), inset 0 1px 0 rgb(255 255 255 / .3)' }}>
              <Factory size={18} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-extrabold tracking-tight">Corrugate<span className="text-gradient">IQ</span></div>
              <div className="hidden text-[10px] text-mute sm:block">Factory Intelligence. Measurable Efficiency.</div>
            </div>
          </div>
          <select className="sel" aria-label="Plant" value={PLANT.id} onChange={() => undefined}>
            <option value={PLANT.id}>{PLANT.name}</option>
          </select>
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-xs text-mute" title="Derived from OEE of the current view">
            <span className={`pulse-dot h-2 w-2 rounded-full ${status.c}`} /> Line <b className="text-ink">{status.t}</b>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-warn/30 bg-warn/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warn" title="All values are simulated from a local dataset">Demo data · simulated</span>
          <select className="sel" aria-label="Date" value={filters.date} onChange={(e) => setFilter({ date: e.target.value })}>
            {DATES.map((d, i) => <option key={d} value={d}>{format(parseISO(d), 'dd MMM yyyy')}{i === 0 ? ' (latest)' : ''}</option>)}
          </select>
          <select className="sel" aria-label="Board grade" value={filters.grade} onChange={(e) => setFilter({ grade: e.target.value as 'All' })}>
            <option value="All">All grades</option>
            <option value="3-Ply">3-Ply</option>
            <option value="5-Ply">5-Ply BC-Flute</option>
          </select>
          {dirty && <button className="btn" onClick={resetFilters}><RotateCcw size={12} /> Reset</button>}
          <button className="btn-primary" onClick={() => openDrawer({ kind: 'whatif' })}>
            <SlidersHorizontal size={13} /> What-If{active ? ' · active' : ''}
          </button>
          <button className="btn !px-2" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
        </div>
      </div>
    </header>
  );
}
