# BinSight

**Live demo:** [reemsalti.github.io/binsight](https://reemsalti.github.io/binsight/)

A frontend portfolio project — a mock **warehouse operations console** for inventory control teams. Demonstrates complex WMS workflows (work queues, bin maps, staging docks, PLT traceability, investigations) with a clean, operations-first UI.

> Demo data only. Brand names (L'Oréal, LEGO, Kellogg's) are fictional portfolio samples.

## Highlights

- **Work queue** — triage reports, holds, investigations, putaway, and outbound staging
- **Rack + staging blueprints** — aisle heatmap, instage/outstage dock floors
- **PLT journey** — activity log with operators, expandable full-page detail
- **RCV / ORD drill-down** — receipt and order line breakdown
- **Investigation counts** — floor recounts after order picks
- **Stock reports** — scenario-driven issue filing from the floor

## Tech stack

React 19 · TypeScript · Vite 8 · Tailwind CSS · Lucide React

Mock service layer in `src/services/wmsApi.ts` — structured for future API swap, no backend required.

## Run locally

**Requirements:** Node.js 22+ (see `.nvmrc`)

```bash
git clone https://github.com/reemsalti/binsight.git
cd binsight
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Click **Refresh** in the toolbar to reload mock WMS data.

```bash
npm run build    # production build
npm run preview  # preview production build
```

## Project layout

```
src/
  components/   UI modules, blueprint, side panels
  services/     Mock WMS API
  mock-data/      Deterministic demo snapshot
  utils/          Blueprint, staging, reports
  config/         Navigation and actions
```

## License

Portfolio project — all rights reserved.
