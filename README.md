# CorrugateIQ — Factory Intelligence. Measurable Efficiency.

React + Vite + TypeScript + Tailwind + Recharts + Zustand dashboard for a corrugation plant. Runs locally, no backend or keys.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
```

## Architecture
- `src/data/dataset.ts` — plant, shifts, machines, productionBatches, materialConsumption, downtimeEvents, orders, simulationAssumptions (7 days, 3 shifts, 3-Ply & 5-Ply). Default day reproduces the brief: input 48.0 t = good 44.2 + trim 1.8 + rejects 1.3 + die-cut 0.7.
- `src/engine.ts` — all business formulas (yield, scrap %, deckle utilization, availability, performance, quality, OEE, scrap/downtime loss, margin leakage), filtering, what-if levers, machine status/WIP, alerts. No calculations live in UI components.
- `src/store.ts` / `src/hooks.ts` — Zustand state (filters, theme in localStorage, levers, drawers) and derived views (`base` vs `sim`).
- `src/components/` — Header, Kpis, YieldFlow (custom SVG flow), Pipeline, ShiftMatrix, LossFeed, Drawers (machine, thermal, queue, what-if).

## Notes / deviations from the brief's illustrative numbers
- Good output is derived (input − scrap), so the balance always reconciles. Machine records hold downtime only, so tonnage is never double-counted.
- KPI leakage ₹38,400 (₹24,900 + ₹13,500) is reproduced via explicit assumptions (net paper loss ₹6,553/t scrap; ₹3,000/t margin; 135 min downtime at 2 t/h).
- Deckle utilization is derived from tonnage (96.3%), not the brief's 94.4%, because 94.4% is incompatible with 1.8 t trim on 48 t. Scenario impacts (₹14,200 / ₹9,500) are derived from the same data, so they differ from the brief's illustrative values.
- Scenario 1 batch fix, and the What-If sliders, rewrite batch records and recompute everything. Thermal and queue views are simulated/estimated and labelled as such.
- The brief text provided ended mid-sentence at section 11 ("Create a clear distinction between: Input…"), so later sections, if any, are not covered.
- Dependencies were not installed or build-tested in the authoring sandbox; run `npm run typecheck` if anything complains.
