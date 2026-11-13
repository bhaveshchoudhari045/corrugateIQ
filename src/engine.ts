/**
 * CorrugateIQ — centralized business calculation engine.
 * No UI code here. All dashboard figures derive from the same dataset via computeScope().
 *
 * Formulas (percentages are 0–100 unless noted):
 *  materialYield      = Good Output / Raw Input × 100
 *  scrapPct           = Total Scrap / Raw Input × 100
 *  deckleUtilization  = Usable Paper Width / Reel Width × 100   (tonnage proxy: (input − trim) / input)
 *  downtimePct        = Downtime / Planned Time × 100
 *  availability       = Operating Time / Planned Time × 100
 *  performance        = Actual Rate / Ideal Rate × 100          (operating-minute weighted)
 *  quality            = Good / Total Produced × 100             (tonnage)
 *  OEE                = (A/100) × (P/100) × (Q/100) × 100
 *  paperScrapLoss     = Scrap t × net paper loss per t
 *  downtimeLoss       = Lost t × contribution margin per t      (Lost t = downtime min × ideal t/min)
 *  netMarginLeakage   = paperScrapLoss + downtimeLoss
 */
import { DATA, DATES, ASSUMPTIONS } from './data/dataset';
import { inr } from './format';
import type {
  Alert, Assumptions, BatchRec, DowntimeEvent, Filters, Levers, MachineStat, MachineStatus, Metrics, Scope, ShiftId,
} from './types';

// ---------- primitive formulas ----------
export const safeDiv = (a: number, b: number) => (b === 0 || !isFinite(b) ? 0 : a / b);
export const pct = (a: number, b: number) => safeDiv(a, b) * 100;
export const materialYield = (good: number, input: number) => pct(good, input);
export const scrapPercentage = (scrap: number, input: number) => pct(scrap, input);
export const deckleUtilization = (usable: number, reel: number) => pct(usable, reel);
export const downtimePercentage = (dt: number, planned: number) => pct(dt, planned);
export const availability = (operating: number, planned: number) => pct(operating, planned);
export const performance = (actual: number, ideal: number) => pct(actual, ideal);
export const quality = (good: number, total: number) => pct(good, total);
export const oee = (a: number, p: number, q: number) => (a / 100) * (p / 100) * (q / 100) * 100;
export const paperScrapLoss = (scrapT: number, costPerT: number) => scrapT * costPerT;
export const downtimeLoss = (lostT: number, marginPerT: number) => lostT * marginPerT;
export const netMarginLeakage = (scrapLoss: number, dtLoss: number) => scrapLoss + dtLoss;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const NO_LEVERS: Levers = { batchFix: false, trimRed: 0, rejectRed: 0, downtimeRed: 0, speedImp: 0 };
export const leversActive = (l: Levers) => l.batchFix || l.trimRed > 0 || l.rejectRed > 0 || l.downtimeRed > 0 || l.speedImp > 0;
export const DEFAULT_FILTERS: Filters = { date: DATES[0], grade: 'All', shift: 'All' };
export { DATES, ASSUMPTIONS };

const RAW: BatchRec[] = DATA.batches.map((b) => {
  const c = DATA.consumption.find((x) => x.batchId === b.id)!;
  return { ...b, ...c, goodT: c.inputT - c.trimT - c.rejectT - c.dieCutT };
});

const matcher = (f: Filters) => (x: { date: string; shift: ShiftId; grade: string }) =>
  x.date === f.date && (f.shift === 'All' || x.shift === f.shift) && (f.grade === 'All' || x.grade === f.grade);

// ---------- aggregation ----------
export function summarize(batches: BatchRec[], events: DowntimeEvent[], a: Assumptions): Metrics {
  const inputT = sum(batches.map((b) => b.inputT));
  const goodT = sum(batches.map((b) => b.goodT));
  const trimT = sum(batches.map((b) => b.trimT));
  const rejectT = sum(batches.map((b) => b.rejectT));
  const dieCutT = sum(batches.map((b) => b.dieCutT));
  const scrapT = trimT + rejectT + dieCutT;
  const planT = sum(batches.map((b) => b.planT));
  const plannedMin = sum(batches.map((b) => b.plannedMin));
  const downtimeMin = sum(events.map((e) => e.minutes));
  const operatingMin = Math.max(0, plannedMin - downtimeMin);
  let num = 0, den = 0;
  batches.forEach((b) => {
    const dt = sum(events.filter((e) => e.batchId === b.id).map((e) => e.minutes));
    const op = Math.max(0, b.plannedMin - dt);
    num += b.avgSpeed * op; den += b.idealSpeed * op;
  });
  const av = availability(operatingMin, plannedMin);
  const pf = performance(num, den);
  const q = quality(goodT, inputT);
  const lostT = downtimeMin * a.idealTonsPerMin;
  const sl = paperScrapLoss(scrapT, a.netPaperLossPerTon);
  const dl = downtimeLoss(lostT, a.contributionMarginPerTon);
  const trimPct = pct(trimT, inputT);
  return {
    inputT, goodT, trimT, rejectT, dieCutT, scrapT, planT, plannedMin, downtimeMin, operatingMin,
    availability: av, performance: pf, quality: q, oee: oee(av, pf, q),
    yieldPct: materialYield(goodT, inputT), scrapPct: scrapPercentage(scrapT, inputT), trimPct,
    rejectPct: pct(rejectT, inputT), dieCutPct: pct(dieCutT, inputT), goodPct: pct(goodT, inputT),
    achievement: pct(goodT, planT), deckleUtil: deckleUtilization(inputT - trimT, inputT),
    excessTrimT: Math.max(0, trimT - (a.targetTrimPct / 100) * inputT), downtimePct: downtimePercentage(downtimeMin, plannedMin),
    lostT, scrapLoss: sl, downtimeLoss: dl, leakage: netMarginLeakage(sl, dl),
  };
}

/** Builds the filtered dataset, applies what-if levers to the underlying records, and recalculates all metrics. */
export function computeScope(f: Filters, l: Levers = NO_LEVERS, a: Assumptions = ASSUMPTIONS): Scope {
  const m = matcher(f);
  const rawB = RAW.filter(m);
  const rawE = DATA.events.filter(m);
  const events = rawE.map((e) => ({ ...e, minutes: e.minutes * (1 - l.downtimeRed) }));
  const batches = rawB.map((b) => {
    const dt0 = sum(rawE.filter((e) => e.batchId === b.id).map((e) => e.minutes));
    const dt1 = dt0 * (1 - l.downtimeRed);
    const speed1 = Math.min(b.idealSpeed, b.avgSpeed * (1 + l.speedImp));
    const r = safeDiv(b.plannedMin - dt1, b.plannedMin - dt0) * safeDiv(speed1, b.avgSpeed) || 1;
    let trim = b.trimT;
    if (l.batchFix && pct(trim, b.inputT) > a.trimAlertPct) trim = b.inputT * (a.targetTrimPct / 100);
    trim *= 1 - l.trimRed;
    const rej = b.rejectT * (1 - l.rejectRed);
    const inputT = b.inputT * r, trimT = trim * r, rejectT = rej * r, dieCutT = b.dieCutT * r;
    return { ...b, avgSpeed: speed1, inputT, trimT, rejectT, dieCutT, goodT: inputT - trimT - rejectT - dieCutT };
  });
  return { f, batches, events, m: summarize(batches, events, a) };
}

export const reconciles = (m: Metrics) => Math.abs(m.goodT + m.scrapT - m.inputT) < 1e-6;

export function dailyLeakage(f: Filters) {
  return [...DATES].reverse().map((d) => ({ date: d, leak: computeScope({ ...f, date: d }).m.leakage }));
}

// ---------- machines ----------
export function machineStats(s: Scope, a: Assumptions = ASSUMPTIONS): MachineStat[] {
  const dts = DATA.machines.map((mc) => sum(s.events.filter((e) => e.machine === mc.id).map((e) => e.minutes)));
  const maxDt = Math.max(...dts);
  const bi = maxDt > 0 ? dts.indexOf(maxDt) : -1;
  return DATA.machines.map((mc, i) => {
    const evs = s.events.filter((e) => e.machine === mc.id);
    const dt = dts[i];
    let status: MachineStatus = 'Running';
    if (i === bi && pct(dt, s.m.plannedMin) >= 2) status = 'Stopped';
    else if (dt > 0 && evs.every((e) => e.cause === 'maintenance')) status = 'Maintenance';
    else if (bi > 0 && i === bi - 1) status = 'Idle';
    return {
      id: mc.id, name: mc.name, plannedSpeed: mc.plannedSpeed, status,
      speed: status === 'Running' ? (mc.plannedSpeed * s.m.performance) / 100 : 0,
      downtimeMin: dt, wip: Math.round(dt * a.sheetsPerMin), events: evs, isBottleneck: i === bi,
      stage: mc.stage, suggestion: mc.suggestion,
    };
  });
}

export const hoursFor = (s: 'All' | ShiftId) =>
  s === 'A' ? [6, 7, 8, 9, 10, 11, 12, 13] : s === 'B' ? [14, 15, 16, 17, 18, 19, 20, 21] : s === 'C' ? [22, 23, 24, 25, 26, 27, 28, 29] :
  Array.from({ length: 24 }, (_, i) => i + 6);
const hl = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;
const wig = (h: number) => ((h * 17 + 5) % 9) - 4;

export function machineHourly(st: MachineStat, s: Scope) {
  const base = (st.plannedSpeed * s.m.performance) / 100;
  return hoursFor(s.f.shift).map((h) => {
    let v = base + wig(h) * 0.6;
    s.events.filter((e) => e.machine === st.id && e.hour === h % 24).forEach((e) => { v *= 1 - Math.min(1, e.minutes / 60); });
    return { hour: hl(h), speed: Math.round(v * 10) / 10, planned: st.plannedSpeed };
  });
}

export function thermalSeries(s: Scope) {
  const rows = hoursFor(s.f.shift).map((h) => {
    const sh: ShiftId = h < 14 ? 'A' : h < 22 ? 'B' : 'C';
    const bs = s.batches.filter((b) => b.shift === sh);
    const base = bs.length ? sum(bs.map((b) => b.avgSpeed)) / bs.length : 235;
    const speed = Math.round((base + wig(h)) * 10) / 10;
    const drop = Math.round(0.45 * Math.max(0, speed - 220) * 10) / 10;
    return { hour: hl(h), speed, glueTemp: Math.round((180 - drop) * 10) / 10, drop, defectPct: Math.round((0.8 + 0.22 * drop) * 10) / 10 };
  });
  return { rows, maxDrop: Math.max(0, ...rows.map((r) => r.drop)) };
}

// ---------- flexo queue ----------
export function queueData(s: Scope, a: Assumptions = ASSUMPTIONS) {
  const m = matcher(s.f);
  const orders = DATA.orders.filter(m);
  const est = (seq: typeof orders, preStage: boolean) =>
    sum(seq.slice(1).map((o, i) => 6 + 3 * Math.abs(o.colors - seq[i].colors) + (preStage || o.platesStaged ? 0 : 10)));
  const suggested = [...orders].sort((x, y) => x.colors - y.colors);
  const jobs = orders.map((o) => {
    const mm = sum(s.events.filter((e) => e.batchId === o.batchId && e.machine === 'flexo').map((e) => e.minutes));
    return { ...o, measured: mm > 0 ? mm : null };
  });
  const wip = Math.round(sum(s.events.filter((e) => e.machine === 'flexo').map((e) => e.minutes)) * a.sheetsPerMin);
  return { jobs, suggested, currentEst: est(orders, false), suggestedEst: est(suggested, true), wip };
}

// ---------- alerts (built from the BASELINE scope so they describe the actual problem) ----------
export function buildAlerts(base: Scope, a: Assumptions = ASSUMPTIONS): Alert[] {
  const bs = base.batches;
  const over = bs.filter((b) => pct(b.trimT, b.inputT) > a.trimAlertPct);
  const worst = [...bs].sort((x, y) => pct(y.trimT, y.inputT) - pct(x.trimT, x.inputT))[0];
  const excessT = sum(over.map((b) => b.trimT - (a.targetTrimPct / 100) * b.inputT));
  const glue = base.events.filter((e) => e.cause === 'glue-temp');
  const glueMin = sum(glue.map((e) => e.minutes));
  const th = thermalSeries(base);
  const warpT = base.m.rejectT * a.warpShare;
  const flexo = base.events.filter((e) => e.machine === 'flexo' && e.cause === 'changeover');
  const maxCo = flexo.length ? Math.max(...flexo.map((e) => e.minutes)) : 0;
  const coEv = flexo.find((e) => e.minutes === maxCo);
  const flexoWip = Math.round(sum(base.events.filter((e) => e.machine === 'flexo').map((e) => e.minutes)) * a.sheetsPerMin);
  const bn = (id: string) => id.replace(/^\d{4}-\d{2}-\d{2}-/, 'Shift ').replace('-', ' · ');
  return [
    {
      id: 'trim', severity: 'Critical', active: over.length > 0, button: 'SIMULATE BATCH FIX',
      impact: over.length ? `${inr(excessT * a.netPaperLossPerTon)} paper loss in view` : 'Within target',
      affected: over.length ? over.map((b) => bn(b.id)).join(', ') : 'No batch above trim alert threshold',
      title: 'Excess Deckle Side-Trim',
      problem: 'Excessive paper trim — reel width and order cutting width are poorly matched.',
      rootCause: 'Order combination does not fill the deckle; a wider reel than the order mix needs was loaded.',
      action: 'Optimise the order combination and select a more suitable reel width for the next batch.',
      evidence: worst ? [
        { kind: 'measured', text: `Reel width ${worst.reelWidthMm.toLocaleString()} mm; cut width ${worst.cutWidthMm.toLocaleString()} mm; unused ${worst.reelWidthMm - worst.cutWidthMm} mm` },
        { kind: 'measured', text: `Trim waste ${pct(worst.trimT, worst.inputT).toFixed(1)}% vs target ${a.targetTrimPct}% (${bn(worst.id)})` },
        { kind: 'calculated', text: `Excess trim ${excessT.toFixed(2)} t × ₹${Math.round(a.netPaperLossPerTon).toLocaleString('en-IN')}/t net paper loss` },
      ] : [],
    },
    {
      id: 'warp', severity: 'Warning', active: glueMin > 0, button: 'VIEW THERMAL TREND',
      impact: glueMin > 0 ? `${inr(warpT * a.netPaperLossPerTon + glueMin * a.idealTonsPerMin * a.contributionMarginPerTon)} in view` : 'None',
      affected: 'Single Facer · 5-Ply runs',
      title: 'Board Delamination & Edge Warp',
      problem: 'Weak bonding from unstable glue temperature during high-speed production.',
      rootCause: 'Glue temperature falls as line speed rises, weakening flute-to-liner bonding.',
      action: 'Review temperature stability and adjust speed per validated production settings — illustrative, requires supervisor validation.',
      evidence: [
        { kind: 'measured', text: `Glue-temperature stops: ${glueMin.toFixed(0)} min across ${glue.length} events` },
        { kind: 'calculated', text: `Simulated glue-temp drop up to ${th.maxDrop.toFixed(1)}°C at high speed` },
        { kind: 'calculated', text: `Wet-end rejects ${base.m.rejectT.toFixed(2)} t; ${(a.warpShare * 100).toFixed(0)}% assumed bond-related` },
      ],
    },
    {
      id: 'flexo', severity: 'Bottleneck', active: maxCo > a.targetChangeoverMin, button: 'VIEW QUEUE',
      impact: maxCo > 0 ? `${maxCo.toFixed(0)} min changeover (${Math.max(0, maxCo - a.targetChangeoverMin).toFixed(0)} min over target)` : 'None',
      affected: coEv ? `Flexo Printer · ${bn(coEv.batchId)}` : 'Flexo Printer',
      title: 'Flexo Printer Changeover Bottleneck',
      problem: `A changeover takes ${maxCo.toFixed(0)} min against a ${a.targetChangeoverMin}-min target.`,
      rootCause: 'Plates are not pre-staged and jobs are sequenced without regard to ink-colour changes.',
      action: 'Pre-stage printing plates and optimise job sequencing.',
      evidence: [
        { kind: 'measured', text: `Changeover ${maxCo.toFixed(0)} min vs ${a.targetChangeoverMin} min target` },
        { kind: 'measured', text: `Flexo WIP backlog ${flexoWip.toLocaleString('en-IN')} sheets` },
        { kind: 'calculated', text: `Excess ${Math.max(0, maxCo - a.targetChangeoverMin).toFixed(0)} min × ${(a.idealTonsPerMin * 60).toFixed(1)} t/h ideal rate × ₹${a.contributionMarginPerTon.toLocaleString('en-IN')}/t margin` },
      ],
    },
  ];
}

// ---------- analytics series (charts) ----------
/** Oldest → newest daily KPIs for the active grade/shift filters (date filter is ignored). */
export function trendSeries(f: Filters, l: Levers = NO_LEVERS) {
  return [...DATES].reverse().map((d) => {
    const m = computeScope({ ...f, date: d }, l).m;
    return { date: d, oee: m.oee, yieldPct: m.yieldPct, leak: m.leakage, goodT: m.goodT, planT: m.planT };
  });
}

/** Downtime minutes grouped by root cause, largest first. */
export function downtimeByCause(s: Scope) {
  const map = new Map<string, number>();
  s.events.forEach((e) => map.set(e.cause, (map.get(e.cause) ?? 0) + e.minutes));
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()].map(([cause, minutes]) => ({ cause, minutes, share: pct(minutes, total) })).sort((a, b) => b.minutes - a.minutes);
}

/** Machine × hour-of-plant-day (06:00 → 05:00) downtime minutes. */
export function downtimeHeat(s: Scope) {
  const hours = hoursFor('All').map((h) => h % 24);
  const rows = DATA.machines.map((mc) => ({
    id: mc.id, name: mc.name,
    cells: hours.map((h) => sum(s.events.filter((e) => e.machine === mc.id && e.hour === h).map((e) => e.minutes))),
  }));
  return { hours, rows, max: Math.max(0, ...rows.flatMap((r) => r.cells)) };
}

/** OEE components per shift, for the radar comparison. */
export function shiftProfile(f: Filters, l: Levers = NO_LEVERS) {
  const m = (id: ShiftId) => computeScope({ ...f, shift: id }, l).m;
  const [a, b, c] = [m('A'), m('B'), m('C')];
  return [
    { metric: 'Availability', A: a.availability, B: b.availability, C: c.availability },
    { metric: 'Performance', A: a.performance, B: b.performance, C: c.performance },
    { metric: 'Quality', A: a.quality, B: b.quality, C: c.quality },
    { metric: 'Yield', A: a.yieldPct, B: b.yieldPct, C: c.yieldPct },
    { metric: 'Deckle util.', A: a.deckleUtil, B: b.deckleUtil, C: c.deckleUtil },
  ];
}
