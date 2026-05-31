# BinSight

Mock warehouse-side **WMS operations console** for inventory control — work queue, bin visibility, staging docks, PLT traceability, investigations, holds, and stock reports. Built as a **frontend portfolio piece** with a swappable mock API layer (`wmsApi.ts`).

> **Demo only.** Company names (L'Oréal, LEGO, Kellogg's) are sample data for visualization.

## Live demo

Deploy `dist/` after `npm run build`, or run locally (see below).

## Features

- **Work queue** — reports, holds, investigations, putaway, outbound staging
- **Rack + staging blueprints** — instage/outstage open-floor docks, aisle heatmap
- **PLT journey** — activity log, operators, full-page detail view
- **RCV / ORD breakdown** — receipt and order drill-down
- **Investigation item counts** — floor recounts after order picks
- **Stock reports** — scenario-driven floor issue filing

## Tech stack

| Layer | Technology |
|-------|------------|
| UI | React 19, TypeScript, Tailwind CSS |
| Build | Vite 8 |
| Icons | Lucide React |
| Data | Mock service layer (no backend) |

## Requirements

- **Node.js 22+** (see `.nvmrc`)
- npm 10+

## Quick start

```bash
git clone https://github.com/reemsalti/binsight.git
cd binsight
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Use **Refresh** in the toolbar to reload mock WMS data.

```bash
npm run build    # production build → dist/
npm run preview  # preview production build
```

## Project structure

```
src/
  components/     UI modules, blueprint, panels
  services/       wmsApi.ts — mock API (swap for HTTP later)
  mock-data/      Deterministic demo snapshot generator
  utils/          Blueprint, staging, reports, labels
  config/         Nav, warehouse actions
PROJECT_BRIEF.md  Architecture & requirements (source of truth)
```

## Branching (simple)

| Branch | Purpose |
|--------|---------|
| `main` | Stable, deployable code — **default** |
| `feature/*` | Optional: one feature per branch, merge via PR |

No staging/production environments yet — this is a static frontend with mock data. GitHub Actions runs `npm run build` on every push to `main`.

## Documentation

See **[PROJECT_BRIEF.md](./PROJECT_BRIEF.md)** for module behavior, location formats, mock data rules, and changelog.

## License

Private portfolio project — all rights reserved unless otherwise specified.
