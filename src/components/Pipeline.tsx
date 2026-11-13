import { ChevronRight, Cog } from 'lucide-react';
import { useView } from '../hooks';
import { useStore } from '../store';
import { machineStats } from '../engine';
import { n0 } from '../format';
import { Badge, Section } from './ui';
import type { Tone } from './ui';
import type { MachineStatus } from '../types';

const DOT: Record<Tone, string> = { ok: 'bg-ok text-ok', warn: 'bg-warn text-warn', crit: 'bg-crit text-crit', mute: 'bg-mute text-mute' };
const TONE: Record<MachineStatus, Tone> = { Running: 'ok', Idle: 'warn', Stopped: 'crit', Maintenance: 'warn' };

export default function Pipeline() {
  const { sim } = useView();
  const open = useStore((s) => s.openDrawer);
  const stats = machineStats(sim);

  return (
    <Section icon={<Cog size={16} />} delay={420} title="Production line status" sub="Reel Stand → Single Facer → Double Backer → Slitter-Scorer → Flexo Printer → Die Cutter. Status derived from downtime events in the current view. Click a machine for detail.">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[1040px] items-stretch">
          {stats.map((s, i) => {
            const prev = stats[i - 1];
            const backlog = s.wip;
            return (
              <div key={s.id} className="flex flex-1 items-stretch">
                {i > 0 && (
                  <div className="flex w-14 flex-col items-center justify-center px-1 text-center" title={`WIP buffer before ${s.name}`}>
                    <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div className={`h-full rounded-full ${backlog > 1000 ? 'bg-crit' : backlog > 400 ? 'bg-warn' : 'bg-ok'}`} style={{ width: `${Math.min(100, (backlog / 1600) * 100)}%` }} />
                    </div>
                    <div className={`text-[10px] font-semibold ${backlog > 1000 ? 'text-crit' : 'text-mute'}`}>{n0(backlog)}</div>
                    <ChevronRight size={14} className="text-mute" />
                    <div className="sr-only">after {prev.name}</div>
                  </div>
                )}
                <button
                  onClick={() => open({ kind: 'machine', id: s.id })}
                  className={`group flex-1 rounded-2xl border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg ${s.isBottleneck ? 'border-crit/50 bg-crit/5 shadow-[0_0_28px_-10px_rgb(var(--crit)/.7)]' : 'border-line bg-bg/40'}`}
                >
                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold tracking-widest text-mute">
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <span className={`h-2 w-2 rounded-full ${DOT[TONE[s.status]]} ${s.status === 'Running' ? 'pulse-dot' : ''}`} />
                  </div>
                  <div className="mb-2 font-display text-[13px] font-bold leading-tight">{s.name}</div>
                  <div className="mb-3"><Badge tone={TONE[s.status]}>{s.status}</Badge></div>
                  <div className="mb-3 h-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-accent to-accent2" style={{ width: `${Math.min(100, s.plannedSpeed ? (s.speed / s.plannedSpeed) * 100 : 0)}%` }} /></div>
                  <dl className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between"><dt className="text-mute">Speed</dt><dd className="font-semibold">{s.speed.toFixed(0)} m/min</dd></div>
                    <div className="flex justify-between"><dt className="text-mute">Planned</dt><dd>{s.plannedSpeed} m/min</dd></div>
                    <div className="flex justify-between"><dt className="text-mute">Downtime</dt><dd className={s.downtimeMin > 30 ? 'font-semibold text-crit' : ''}>{s.downtimeMin.toFixed(0)} min</dd></div>
                    <div className="flex justify-between"><dt className="text-mute">WIP waiting</dt><dd>{n0(s.wip)} sheets</dd></div>
                  </dl>
                  {s.isBottleneck && <div className="mt-3 inline-flex rounded-full bg-crit/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-crit">Bottleneck</div>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-mute">Connector bars show sheets accumulating in the buffer before each stage (stopped minutes × sheets/min assumption). Machine records carry downtime only — production tonnage is counted once, at line level.</p>
    </Section>
  );
}
