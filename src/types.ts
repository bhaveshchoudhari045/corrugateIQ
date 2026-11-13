export type Grade = '3-Ply' | '5-Ply';
export type ShiftId = 'A' | 'B' | 'C';
export type MachineId = 'reel' | 'facer' | 'backer' | 'slitter' | 'flexo' | 'diecut';
export type Cause = 'changeover' | 'breakdown' | 'maintenance' | 'material' | 'jam' | 'glue-temp';
export type MachineStatus = 'Running' | 'Idle' | 'Stopped' | 'Maintenance';

export interface Plant { id: string; name: string; city: string }
export interface Shift { id: ShiftId; label: string; start: number; end: number }
export interface MachineDef { id: MachineId; name: string; plannedSpeed: number; stage: string; suggestion: string }

export interface ProductionBatch {
  id: string; date: string; shift: ShiftId; grade: Grade;
  plannedMin: number; avgSpeed: number; idealSpeed: number; planT: number;
  reelWidthMm: number; cutWidthMm: number; orderId: string;
}
/** Material balance per batch. Good output is DERIVED (input - all scrap), so the balance always reconciles. */
export interface MaterialConsumption { batchId: string; inputT: number; trimT: number; rejectT: number; dieCutT: number }
export interface DowntimeEvent {
  id: string; date: string; batchId: string; shift: ShiftId; grade: Grade;
  machine: MachineId; cause: Cause; minutes: number; hour: number;
}
export interface Order {
  id: string; batchId: string; date: string; shift: ShiftId; grade: Grade;
  customer: string; colors: number; platesStaged: boolean; sheets: number;
}
export interface Assumptions {
  revenuePerTon: number; variableCostPerTon: number; contributionMarginPerTon: number;
  netPaperLossPerTon: number; idealTonsPerMin: number; sheetsPerMin: number;
  targetTrimPct: number; targetDeckleUtil: number; trimAlertPct: number;
  targetChangeoverMin: number; warpShare: number; oeeWorldClass: number;
}

export interface BatchRec extends ProductionBatch, MaterialConsumption { goodT: number }

export interface Filters { date: string; grade: 'All' | Grade; shift: 'All' | ShiftId }
export interface Levers { batchFix: boolean; trimRed: number; rejectRed: number; downtimeRed: number; speedImp: number }

export interface Metrics {
  inputT: number; goodT: number; trimT: number; rejectT: number; dieCutT: number; scrapT: number; planT: number;
  plannedMin: number; downtimeMin: number; operatingMin: number;
  availability: number; performance: number; quality: number; oee: number;
  yieldPct: number; scrapPct: number; trimPct: number; rejectPct: number; dieCutPct: number; goodPct: number;
  achievement: number; deckleUtil: number; excessTrimT: number; downtimePct: number;
  lostT: number; scrapLoss: number; downtimeLoss: number; leakage: number;
}
export interface Scope { f: Filters; batches: BatchRec[]; events: DowntimeEvent[]; m: Metrics }
export interface MachineStat {
  id: MachineId; name: string; plannedSpeed: number; speed: number; status: MachineStatus;
  downtimeMin: number; wip: number; events: DowntimeEvent[]; isBottleneck: boolean; stage: string; suggestion: string;
}
export interface Evidence { kind: 'measured' | 'calculated'; text: string }
export interface Alert {
  id: 'trim' | 'warp' | 'flexo'; severity: 'Critical' | 'Warning' | 'Bottleneck'; active: boolean;
  impact: string; affected: string; title: string; problem: string; rootCause: string; action: string;
  evidence: Evidence[]; button: string;
}
