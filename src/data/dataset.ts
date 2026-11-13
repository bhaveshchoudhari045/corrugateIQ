import { format, subDays } from 'date-fns';
import type {
  Assumptions, DowntimeEvent, Grade, MachineDef, MachineId, MaterialConsumption, Order,
  Cause, Plant, ProductionBatch, Shift, ShiftId,
} from '../types';

export const PLANT: Plant = { id: 'U1', name: 'Unit 1 – Thane Corrugation Plant', city: 'Thane' };

export const SHIFTS: Shift[] = [
  { id: 'A', label: 'Shift A', start: 6, end: 14 },
  { id: 'B', label: 'Shift B', start: 14, end: 22 },
  { id: 'C', label: 'Shift C', start: 22, end: 30 },
];

export const MACHINES: MachineDef[] = [
  { id: 'reel', name: 'Reel Stand', plannedSpeed: 250, stage: 'Paper feed & splicing', suggestion: 'Audit splice quality and reel-change timing to avoid wet-end rejects.' },
  { id: 'facer', name: 'Single Facer', plannedSpeed: 250, stage: 'Flute forming & glue application', suggestion: 'Review glue-temperature stability against line speed (illustrative — settings need supervisor validation).' },
  { id: 'backer', name: 'Double Backer', plannedSpeed: 250, stage: 'Bonding & curing', suggestion: 'Schedule maintenance outside peak runs; check belt and steam stability.' },
  { id: 'slitter', name: 'Slitter-Scorer', plannedSpeed: 250, stage: 'Deckle trimming & scoring', suggestion: 'Re-plan order combinations per reel width to cut deckle trim; verify knife schedule.' },
  { id: 'flexo', name: 'Flexo Printer', plannedSpeed: 240, stage: 'Printing & changeover', suggestion: 'Pre-stage plates before the previous job ends and sequence jobs by ink-colour count.' },
  { id: 'diecut', name: 'Die Cutter', plannedSpeed: 230, stage: 'Die-cutting & slotting', suggestion: 'Review die layout/nesting and blank-feed jam causes.' },
];

export const WASTE_INFO = {
  good: { label: 'Good Boards', stage: 'Finished output', machine: 'Die Cutter (final count)', action: 'Maintain yield; protect good output from downstream rejects.' },
  trim: { label: 'Side-Trim Waste', stage: 'Slitter-Scorer — deckle trimming', machine: 'Slitter-Scorer / order planning', action: 'Match order widths to a better-fitting reel width; combine orders to fill the deckle.' },
  reject: { label: 'Wet-End Warp & Splicing Rejects', stage: 'Single Facer → Double Backer (wet end)', machine: 'Single Facer / Reel Stand splicer', action: 'Stabilise glue temperature vs. speed and tighten splice quality (supervisor validation required).' },
  diecut: { label: 'Die-Cut & Slotting Scrap', stage: 'Die Cutter — slotting & cutting', machine: 'Die Cutter', action: 'Review die layout/nesting and clear recurring blank-feed jams.' },
} as const;

export const ASSUMPTIONS: Assumptions = {
  revenuePerTon: 54000,
  variableCostPerTon: 51000,
  contributionMarginPerTon: 54000 - 51000, // revenue - production cost
  // Calibrated to the brief's illustrative ₹24,900 on 3.8 t of scrap (net of scrap-paper resale recovery).
  netPaperLossPerTon: 6552.63,
  idealTonsPerMin: 2 / 60, // ideal good-board throughput: 2 t/h
  sheetsPerMin: 29, // sheets accumulating in the buffer per stopped minute
  targetTrimPct: 2.5,
  targetDeckleUtil: 97.5,
  trimAlertPct: 5,
  targetChangeoverMin: 15,
  warpShare: 0.5, // share of wet-end rejects attributed to glue/bonding issues
  oeeWorldClass: 85,
};

// ---------- Deterministic demo data: 7 days, newest first (index 0 = default "today") ----------
const anchor = new Date(2026, 10, 13);
export const DATES: string[] = [0, 1, 2, 3, 4, 5, 6].map((i) => format(subDays(anchor, i), 'yyyy-MM-dd'));

type Row = [ShiftId, Grade, number, number, number, number, number, number]; // shift, grade, input, trim, reject, dieCut, speed, reelW
const BASE_ROWS: Row[] = [
  ['A', '3-Ply', 9, 0.24, 0.15, 0.10, 240, 1800],
  ['A', '5-Ply', 8, 0.26, 0.25, 0.10, 236, 2000],
  ['B', '3-Ply', 8, 0.25, 0.20, 0.10, 234, 1900],
  ['B', '5-Ply', 8, 0.545, 0.30, 0.15, 229, 2200],
  ['C', '3-Ply', 7.5, 0.245, 0.20, 0.10, 238, 1800],
  ['C', '5-Ply', 7.5, 0.26, 0.20, 0.15, 234, 2000],
];
const CUSTOMERS = ['Sunrise Foods', 'Apex Pharma Cartons', 'Metro Appliances', 'Konkan Agro', 'Bharat Electricals', 'Vashi Textiles'];
const COLORS = [2, 4, 1, 5, 2, 3];
const STAGED = [true, true, true, false, true, false];
const SHEETS = [5200, 4600, 4900, 4300, 4100, 4000];

const BASE_EVENTS: [ShiftId, Grade, MachineId, Cause, number, number][] = [
  ['A', '3-Ply', 'reel', 'material', 8, 7], ['A', '3-Ply', 'flexo', 'changeover', 10, 11],
  ['A', '5-Ply', 'facer', 'glue-temp', 9, 9], ['A', '5-Ply', 'diecut', 'jam', 8, 12],
  ['B', '3-Ply', 'flexo', 'changeover', 34, 15], ['B', '3-Ply', 'reel', 'material', 6, 19],
  ['B', '5-Ply', 'facer', 'glue-temp', 10, 17], ['B', '5-Ply', 'backer', 'maintenance', 5, 20],
  ['C', '3-Ply', 'slitter', 'breakdown', 14, 23], ['C', '3-Ply', 'flexo', 'changeover', 6, 2],
  ['C', '5-Ply', 'facer', 'glue-temp', 15, 1], ['C', '5-Ply', 'diecut', 'jam', 10, 4],
];

// Day multipliers (index 0 = exact spec figures)
const IM = [1, 0.97, 1.03, 0.99, 1.02, 0.95, 1.01];
const TM = [1, 0.72, 0.85, 0.78, 0.9, 0.7, 0.8];
const RM = [1, 0.9, 1.05, 0.85, 0.95, 0.88, 0.92];
const DM = [1, 0.95, 0.9, 1, 0.92, 1.05, 0.9];
const DTM = [1, 0.7, 0.85, 0.65, 0.8, 0.6, 0.75];
const SD = [0, 2, -1, 3, 1, 2, 0];
const r3 = (x: number) => Math.round(x * 1000) / 1000;

const batches: ProductionBatch[] = [];
const consumption: MaterialConsumption[] = [];
const events: DowntimeEvent[] = [];
const orders: Order[] = [];

DATES.forEach((date, d) => {
  BASE_ROWS.forEach(([shift, grade, input, trim, rej, die, speed, reelW], i) => {
    const id = `${date}-${shift}-${grade}`;
    const inputT = r3(input * IM[d]);
    const trimT = r3(trim * TM[d]);
    batches.push({
      id, date, shift, grade, plannedMin: 240, avgSpeed: speed + SD[d], idealSpeed: 250, planT: input,
      reelWidthMm: reelW, cutWidthMm: Math.round(reelW * (1 - trimT / inputT)), orderId: `ORD-${date.slice(5)}-${i + 1}`,
    });
    consumption.push({ batchId: id, inputT, trimT, rejectT: r3(rej * RM[d]), dieCutT: r3(die * DM[d]) });
    orders.push({
      id: `ORD-${date.slice(5)}-${i + 1}`, batchId: id, date, shift, grade,
      customer: CUSTOMERS[i], colors: COLORS[i], platesStaged: STAGED[i], sheets: SHEETS[i],
    });
  });
  BASE_EVENTS.forEach(([shift, grade, machine, cause, minutes, hour], i) => {
    events.push({
      id: `EV-${date.slice(5)}-${i + 1}`, date, batchId: `${date}-${shift}-${grade}`, shift, grade, machine, cause,
      minutes: d === 0 ? minutes : Math.max(1, Math.round(minutes * DTM[d])), hour,
    });
  });
});

export const DATA = { plant: PLANT, shifts: SHIFTS, machines: MACHINES, batches, consumption, events, orders, assumptions: ASSUMPTIONS };
