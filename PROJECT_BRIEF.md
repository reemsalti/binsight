# BinSight — Project Brief

> Source of truth for requirements, architecture, design decisions, and pending work.
> Update this file whenever significant changes are made.

---

## Maintaining context (agent instruction)

When the user says **`context`** (and only that, or clearly means the same thing), do **exactly this**:

1. **Summarize** what changed since the last `PROJECT_BRIEF.md` update — features, UX, files, and open follow-ups.
2. **Update this file** (`PROJECT_BRIEF.md`) so it matches the current app (architecture, modules, shell, changelog).
3. Keep the summary concise for the user in chat; put durable detail in the brief.

Do not treat `context` as a generic “explain the project” request — it is always **summarize + refresh the brief**.

---

## Purpose

BinSight is a simulated warehouse-side WMS operations console for internal inventory control use. It provides a **work queue** (default landing view), bin visibility with rack and **staging (instage/outstage) blueprints**, inventory lookup (including receipt/order refs), location history, **investigation item count** tracking (floor recounts after order picks — not WMS cycle counts), stock hold monitoring, location availability check sheets, and a stock reports queue for floor-discovered issues. **Pallet journey** views (activity log + full-page detail) show qty snapshots, holds, and operator-attributed history. All data is mocked — there is no real backend. The service layer is structured so mock functions can be swapped for real HTTP calls later.

**Important:** Demo only. Company names (L'Oréal, LEGO, Kellogg's) are used for sample portfolio visualization. This is hardcoded in a top banner and must not be removed.

**Design principle:** The WMS only knows what was scanned. Bin status reflects recorded data (available or occupied). Misplaced or unexpected stock is **not** auto-detected — floor staff report it, and Inventory Control resolves it in the Stock Reports queue.

---

## Tech Stack

- **React 18 + TypeScript** (strict mode)
- **Vite 8** (requires Node 24+)
- **Tailwind CSS** (utility-first, no component library)
- **Lucide React** (icons only)
- **PapaParse** (CSV parsing — used for exports)
- **SheetJS / xlsx** (Excel parsing — present but unused in current UI)

```bash
npm run dev      # http://localhost:5173/
npm run build    # production build to /dist
npx tsc --noEmit # type-check only
```

---

## Project Root

```
/Users/school/Downloads/binsight-warehouse-heatmap
```

---

## File Structure

```
src/
  App.tsx                          # Root: sidebar nav, toolbar, module routing (default: work-queue)
  types.ts                         # All TypeScript types (single source of truth)
  main.tsx

  config/
    warehouseNav.ts                # Sidebar nav items (icons, labels, permissions)
    warehouseActions.ts            # Warehouse Actions menu (movement, holds, reports, etc.)
    investigationCountCopy.ts      # User-facing strings for investigation item count module

  mock-data/
    demoUser.ts                    # Hardcoded demo user, role, permissions
    generateMockWarehouseData.ts   # Seeded deterministic mock snapshot generator
    palletLabels.ts                # 8-digit pallet IDs, item ID format, chronological assignment

  services/
    wmsApi.ts                      # All service functions (mock, structured like real API)

  components/
    layout/
      AppSidebar.tsx               # Sidebar: Actions flyout + module icons
      AppToolbar.tsx               # Logo, greeting, live clock, last updated, refresh
      BinSightLogo.tsx             # Grid mark + BinSight wordmark
      LiveClock.tsx                # Live date/time (isolated re-render)
      LastSyncedStamp.tsx          # WMS last updated label + time
      WarehouseActionsFlyout.tsx   # Top-of-sidebar actions menu + toast notices
      WarehouseActionDialog.tsx    # Demo transaction forms (comments required)
      liveClockFormat.ts           # Shared 12-hour time formatter
    AppShellHeader.tsx             # Top bar: greeting, role, access badge, logout
    DashboardHeader.tsx            # Hero card (optional; main flow uses sidebar)
    DashboardSnapshot.tsx          # Operations snapshot KPI row (5 tiles)
    AisleFilterBar.tsx             # Aisle range inputs (standalone / legacy)
    OperationModules.tsx           # Module selector cards (legacy alternate nav)
    DashboardSectionHeader.tsx     # Section title + description block
    FilterSummaryCard.tsx          # Clickable multi-select summary pills
    ListSortAxes.tsx               # Independent date / middle axis / location sort dropdowns
    ProductCardLines.tsx           # Shared product block: client, item, lot, pallet, location
    DataTable.tsx                  # Generic row table for EmptyLocationRow[]
    WarehouseHeatMap.tsx           # Area dropdown (instage/outstage/aisle) + rack + staging blueprint
    StagingDockBlueprint.tsx       # Instage/outstage open-floor dock panels
    LoadReferenceBreakdownPanel.tsx # Receipt/order breakdown side panel
    BinDetailsPanel.tsx            # Compact bin/pallet rail panel (+ expand to full page)
    StockReportForm.tsx            # Scenario-driven stock report filing + WMS lookup

    pallet/
      PalletDetailShared.tsx       # Shared pallet sections, activity log, history cards

    modules/
      WorkQueueModule.tsx          # Default: queue + embedded blueprint rail
      BinVisibilityModule.tsx      # Full-page blueprint + bin panel
      PalletDetailPage.tsx         # Full-page spread-out pallet view
      InventoryLookupModule.tsx
      LocationHistoryModule.tsx
      CycleCountModule.tsx         # UI: "Investigation Item Counts" (module id still cycle-count)
      StockHoldsModule.tsx
      LocationAvailabilityModule.tsx
      StockReportsModule.tsx

  utils/
    location.ts                    # normalizeLocation, parseLocation, formatWarehouseLocation
    warehouseBlueprint.ts          # buildAisleWalkPairs, count open/occupied by aisle
    warehouseStagingBlueprint.ts   # Build instage/outstage dock blueprints from stock
    stagingLocations.ts            # IN-/OUT- location codes, dock constants
    stagingQueue.ts                # Putaway/outbound work queue entries from stock
    loadReferenceBreakdown.ts      # Aggregate stock by RCV/ORD reference
    loadReferenceSearch.ts         # Search receipts/orders in stock snapshot
    binDetails.ts                  # resolveBinStatus, blueprint cells (available | occupied only)
    processLocations.ts            # Derives available locations from empty feed vs stock-on-hand
    historyActions.ts              # Action-type badge colours for location history cards
    palletBreakdown.ts             # formatQuantityBreakdown, formatWeightBreakdown
    listSort.ts                    # Multi-axis list sorting for modules
    cycleCountVariance.ts          # Over/short labels, signed variance, resolution option labels
    investigationCountWorkflow.ts  # Pick-triggered open tasks, awaiting-approval detection
    stockReportScenarios.ts        # Scenario-first stock report form config
    stockReportStatus.ts           # Report status labels and helpers
    wmsLabels.ts                   # WMS UI abbreviations (PLT, PLT ID, formatPltCount)
    holdPriority.ts                # Serious hold code list
    entityFocus.ts                 # Scroll/highlight when opening item from work queue
    wmsAdapters.ts                 # wmsEmptyToRows, wmsStockToRows
    permissions.ts                 # hasPermission(userOrPermissions, permission)
    greeting.ts                    # formatGreeting(name) — time-of-day aware
    exportCsv.ts                   # downloadRowsAsCsv, downloadVerificationCheckSheet
    parseCsv.ts                    # parseEmptyLocationsCsv (unused in UI, kept for future)
    parseExcel.ts                  # parseStockWorkbook (unused in UI, kept for future)
```

---

## Warehouse Location Format

```
AISLE-BAY-LEVELPOSITION
Example: 601-01-A01
```

| Dimension | Range |
|-----------|-------|
| Aisles | 601–622 |
| Bays | 01–38 |
| Levels | A (floor) → E (top) |
| Positions | 01, 02 |

- Total locations: ~16,720
- Default filter range: aisles 601–622
- Blueprint renders even bays on the left, odd bays on the right, with a dashed walk-aisle column between them
- Levels display top-to-bottom as E, D, C, B, A
- Bay header format: `601 - 01`
- Bin slot labels: `A01`, `A02`, `B01`, etc.

### Staging locations (instage / outstage)

Open floor at dock doors — WMS only tracks **scanned pallets**, not fixed empty slots.

| Zone | Code pattern | Example |
|------|--------------|---------|
| Instage (receiving) | `IN-D{door}-{pos}` | `IN-D01-03` |
| Outstage (shipping) | `OUT-D{door}-{pos}` | `OUT-D02-01` |

- **4 dock doors** per zone; **max ~6 pallets per door** (capacity limit in mock data, not shown as empty grid cells)
- **One client per door** — all pallets at a door share the same receipt (instage) or order (outstage)
- Empty doors have no WMS location codes; UI shows “Open floor” only
- Receipt refs: `RCV-` + 5 digits · Outbound orders: `ORD-` + 5 digits

---

## Mock Data Generator

**File:** `src/mock-data/generateMockWarehouseData.ts`

- Seeded with `mulberry32(20260601)` — fully deterministic, same output every run
- Cached in module-level `cachedSnapshot`; cleared on `markWmsSyncComplete()`
- Approximate distribution:
  - ~72% stock-on-hand locations (pallets on rack — shown **occupied** on blueprint)
  - ~17% WMS empty-location feed entries (mostly bins without stock; small overlap with stock for demo)
  - Overlap slots are in both feeds but render as **occupied** (stock-on-hand is source of truth)
  - 22% of locations with location history
  - ~56 **investigation item count** tasks (30 open after pick, 26 in review/closed states)
  - ~40 stock hold records
  - Staging stock: variable pallets per door (instage + outstage), grouped by client/receipt/order
  - Pallet journey history for staging (multi-location: instage → rack → outstage) with **operator** on each event
  - 4 seeded stock reports (reset on WMS sync; new reports persist in session)

**Demo IDs (portfolio-friendly, not random `PLT-` strings):**

| Entity | Format | Example |
|--------|--------|---------|
| Pallet | 8 digits: client block + SKU line + receipt seq | `10030442` (L'Oréal), `11030018` (LEGO), `12020031` (Kellogg's) |
| Item | 2 letters + catalog number | `LO10001`, `LE10003`, `KE10002` |
| Lot | 6-digit numeric (UI shows `Lot 240345`, not `LOT-240345`) | `240345` |
| Investigation task | `INV-` + 5 digits | `INV-10004` |
| Pick order (open investigations) | `ORD-` + 5 digits | `ORD-48012` |
| Receipt / ASN (instage) | `RCV-` + 5 digits | `RCV-24015` |

Pallet sequences are assigned chronologically by receipt date per client/SKU line after stock rows are generated (`assignChronologicalPalletIds` in `palletLabels.ts`).

**Demo clients:**

| Client | Code | Products |
|--------|------|----------|
| L'Oréal | `LOREALCA` | Shampoo 750ML, Cleanser 150ML, Lotion 500ML, Hair Treatment 250ML, Conditioner 750ML |
| LEGO | `LEGOTOYS` | Brick Box 484PC, Mini Figure Blind Bag, Play Set 900PC, Vehicle Pack 3PC, Blocks Starter 250PC |
| Kellogg's | `KELLOGGS` | Granola Bar 35G, Cereal Cup 45G, Breakfast Bar 37G, Cracker 150G, Snack Mix 28G |

**Product description format:** `"Granola Bar Choc Chip 35G"` — concise, WMS-style
**Package details format:** `"6 EA/PK, 12 PK/CASE"` — professional abbreviations (EA, PK, CASE, CTN, ML, G, PC)

---

## Service Layer

**File:** `src/services/wmsApi.ts`

All functions are async with a simulated 300–700ms delay via `wait()`. In-memory Maps (`cycleCountOverrides`, `holdOverrides`) and an array (`stockReports`) store demo state mutations between calls. `markWmsSyncComplete()` resets all overrides, stock reports (re-seeded), and the mock cache.

| Module | Service functions |
|--------|-------------------|
| Core | `fetchEmptyLocations`, `fetchStockOnHand`, `fetchBinDetails`, `fetchLastSyncTime`, `markWmsSyncComplete`, `syncProcessedResults` |
| Bin Visibility | `fetchBinVisibility`, `fetchAisleBlueprint`, `fetchBinStatusSummary` |
| Inventory Lookup | `searchInventory`, `searchLoadReferences`, `fetchInventoryByItemId`, `fetchInventoryByPalletId`, `fetchInventoryByClientCode`, `fetchInventoryByLocation` |
| Location History | `fetchLocationHistory`, `fetchRecentLocationActivity`, `fetchPalletMovementHistory` |
| Investigation counts | `fetchCycleCountTasks`, `fetchCycleCountTaskById`, `updateCycleCountTaskStatus`, `submitCycleCountResult`, `approveInvestigationCount`, `reviewCycleCountDiscrepancy` |
| Stock Holds | `fetchStockHolds`, `fetchHoldByPalletId`, `requestHoldRelease`, `updateHoldStatus` |
| Location Availability | `fetchEmptyLocationValidation`, `validateEmptyLocations`, `exportValidatedAvailableLocations` |
| Stock Reports | `fetchStockReports`, `createStockReport`, `updateStockReportStatus` |

**Legacy internal plumbing (not exposed in UI):** `fetchOccupiedConflicts`, `ProcessedResults.removedMatches`, `OccupiedConflict` type — remnants of an earlier data-vs-data cross-check model. Do not re-expose as user-facing concepts.

**Seeded stock reports** (`buildSeedStockReports()` in `wmsApi.ts`) — reset on WMS refresh; must align with mock snapshot:

| Report | Scenario | Location | Blueprint expectation |
|--------|----------|----------|------------------------|
| SR-1042 | Stock in empty location | `604-07-A01` | **Available** (no stock-on-hand); no PLT ID (unlabeled wrap) |
| SR-1039 | Misplaced PLT | `612-29-B01` | **Occupied** with report PLT `10020018` (note: physically found at `611-15-C02`) |
| SR-1035 | Wrong item | `618-22-B01` | **Occupied** with PLT `10010221`; report card shows floor observation (Kellogg's) vs WMS (L'Oréal) |
| SR-1028 | Damaged product | `607-03-A02` | **Occupied** with PLT `10040147` matching report |

**Investigation count mutations (wired in UI):**

| Function | Behavior |
|----------|----------|
| `submitCycleCountResult(taskId, countedQty, note?)` | Match → `Counted` (pending IC approval); variance → `Discrepancy` with signed `varianceEa` |
| `approveInvestigationCount(taskId)` | `Counted` with zero variance → `Resolved` |
| `reviewCycleCountDiscrepancy(input)` | **Confirm** → `Resolved`, keeps `reviewedVarianceEa`; **Dismiss** → `Counted`, qty corrected, variance zeroed |

**Mock cache:** Snapshot is cached until `markWmsSyncComplete()` / toolbar refresh. After generator changes, users must refresh to see new `INV-` tasks, pallet IDs, and task mix.

---

## TypeScript Types

**File:** `src/types.ts` — single source of truth for all types.

```typescript
BinStatus = "empty" | "occupied"   // no third "unknown" state in UI

// Display labels (BIN_STATUS_LABELS / blueprint):
"empty"     → "Available" (green cells; open slot counts)
"occupied"  → "Occupied" (blue cells; stock on hand)

HoldCode = "NONE"|"DAMAGED"|"QA"|"SUSP"|"EXP"|"RETAIN"|"RETURN"
         | "RECALL"|"QUAR"|"SHORT"|"MISSHIP"|"CUSTHOLD"

HoldStatus = "Active" | "Pending Release" | "Released" | "None"

CycleCountStatus = "Not Started"|"In Progress"|"Counted"|"Discrepancy"|"Resolved"

CycleCountTask.priority = "Low" | "Medium" | "High" | "Critical"

// Investigation-only fields on CycleCountTask:
pickOrderId?, pickedBy?, pickedAt?           // open tasks only — created after order pick
discrepancyOutcome?: "confirmed" | "dismissed"
resolutionType?: "submit_for_investigation" | "request_adjustment" | "counting_error"
              | "recount_matches_expected" | "other"
resolutionNote?, reviewedVarianceEa?         // signed EA on confirm: + over, − short

StockReportType includes "Expected stock not found" (+ original four scenarios)

StockReportStatus = "Open" | "Under Review" | "Resolved"

WarehouseModule = "work-queue" | "bin-visibility" | "inventory-lookup" | "location-history"
                | "cycle-count" | "stock-holds" | "location-availability" | "stock-reports"

WorkQueueItemKind = "report" | "hold" | "count" | "putaway" | "outbound"
WorkQueueNavigateTarget = { kind, entityId, locationCode, loadReferenceKind?, loadReference? }
moduleForQueueItemKind(kind) → stock-reports | stock-holds | cycle-count | null (putaway/outbound stay on queue)

LoadReferenceKind = "receipt" | "order"
LoadReferenceBreakdown = { kind, reference, clientCode, clientName, palletCount, totalQuantityEa, lines[] }

BinLocation.zone = "rack" | "instage" | "outstage"

LocationHistoryRecord includes operator: string (assigned per action type in mock generator)
```

`resolveBinStatus` / blueprint: stock-on-hand → occupied; otherwise → available (open). **No grey "no WMS record" rack cell.** Misplaced stock still via Stock Reports only.

`StockOnHandRecord` includes full weight fields: `unitWeight/Uom`, `caseWeight/Uom`, `palletNetWeight/Uom`, `palletTareWeight/Uom`, `palletGrossWeight/Uom`, `weightBreakdown`.

`StockHoldRecord` does **not** include `releaseEligible` — that field was removed intentionally.

`WmsStockRecord` is `@deprecated` — use `StockOnHandRecord`.

**Quantity breakdown format:** `"48 CASE × 12 EA = 576 EA"`
**Weight breakdown format:** `"48 CASE × 2.8 KG = 134.4 KG NET + 22 KG TARE = 156.4 KG GROSS"`

---

## Demo User & Permissions

**File:** `src/mock-data/demoUser.ts`

```typescript
demoUser = {
  name: "Reem",
  role: "Inventory Control Coordinator",
  accessLevel: "Inventory Access",
  permissions: [
    "view_bins",
    "view_inventory",
    "view_location_history",
    "export_reports",
    "request_adjustments",
    "request_hold_release",   // defined but not currently wired to UI
  ]
}
```

`hasPermission(userOrPermissions, permission)` in `src/utils/permissions.ts` accepts either a `DemoUser` or `DemoPermission[]`.

**Permission gates in current UI:**

| Permission | Controls |
|------------|----------|
| `view_bins` | Bin Visibility and Location Availability modules |
| `view_inventory` | Inventory Lookup, Investigation Item Counts, Stock Holds, Stock Reports modules |
| `view_location_history` | Location History module |
| `export_reports` | Export verification check sheet (Location Availability) |
| `request_adjustments` | "Report misplaced stock" in bin panel; Start review / Mark resolved in Stock Reports |
| `request_hold_release` | Defined, granted to demo user, not currently wired to UI |

In a production system, permissions would come from employee login and WMS access control.

---

## App Shell & Layout

**Very top of page (full-width banner, never remove):**
> Demo data only. Company names are used for sample portfolio visualization.

`bg-slate-50`, `text-[11px] text-slate-500`, centered.

**Viewport:** `html/body/#root` and `main` use **`h-dvh` + `overflow-hidden`** — the **page does not scroll**; lists and blueprint scroll inside panels. Other modules scroll inside `module-workspace`.

**Primary navigation** (`AppSidebar` + `AppToolbar`):
- **Default module:** `work-queue` — **left:** collapsible work queue · **right:** area blueprint (rack / instage / outstage) + bin panel + optional load breakdown
- **Actions** button (green `+`, top of sidebar) opens **Warehouse actions** flyout (relocate, adjustment, holds, damage report, etc.)
- Sidebar labels: Queue, Bins, Lookup, History, **Counts** (investigation; truncated if narrow), Holds, Available, Reports
- Aisle range is **fixed 601–622** in `App.tsx` (`DEFAULT_FILTERS`) — no aisle inputs in toolbar

**Toolbar** (`AppToolbar`):
- **BinSight** logo (grid mark + blue “Sight” accent) + greeting · **live clock** (12-hour, date on same line)
- Role · access under greeting
- **Last updated:** label + date/time + **icon-only refresh** (no “Online” pill)
- Blue top stripe on header; sync cluster in bordered card

**Visual layers (contrast):**
- Page canvas: `bg-slate-200`
- Module area: `.module-workspace` (`slate-50`, `border-2 border-slate-300`)
- Module content: `.module-panel` (white, `border-2`) where applicable

**Legacy components** (still in repo; **not mounted** by current `App.tsx`):
- `AppShellHeader`, `DashboardHeader`, `DashboardSnapshot`, `OperationModules`, standalone `AisleFilterBar`
- Primary UX is sidebar + toolbar only

---

## Module Behavior

### Work Queue (default)
- **Collapsible sections:** Stock reports · Serious holds · Investigation counts · **Awaiting putaway** · **Staged for outbound** (first section expanded by default)
- Each row: `ProductCardLines` + meta + **“Open in …”** (Reports / Holds / Investigation counts)
- **Putaway/outbound rows** stay on work queue — open **instage/outstage blueprint** + **load reference breakdown** panel (receipt or order), not a separate module
- **Click queue row** (report/hold/count) → navigates to the matching module and **highlights** that record (`focusEntityId` + scroll); does **not** open the bin side panel
- **Click a bin or pallet** on the embedded blueprint → bin details panel (same as Bins module)
- Queue and blueprint are **side-by-side** on the home view; putaway/outbound rows link blueprint zone + breakdown

### Load reference breakdown (RCV / ORD)
- Click **RCV-** or **ORD-** on staging dock panels, inventory lookup, or bin/pallet details → right-rail **LoadReferenceBreakdownPanel**
- Shows client, pallet count, total EA, line list (item, lot, qty per pallet)
- Selecting a breakdown on work queue auto-switches blueprint to **instage** (receipt) or **outstage** (order)
- Close via panel X or clearing selection in `App.tsx`

### Staging blueprint (instage / outstage)
- **Area dropdown** in blueprint header: one aisle **or** instage **or** outstage at a time (not simultaneous with rack grid)
- **StagingDockBlueprint:** 4 dock doors; open-floor layout — only **occupied pallets** shown as fixed-width chips (centered flex wrap, full 8-digit pallet ID)
- Per door: client name + clickable receipt/order ref; no empty slot buttons, no capacity labels
- Pallet chip click → bin details panel (compact pallet view)

### Pallet detail (compact panel + full page)
- **BinDetailsPanel** (occupied bins / staging pallets): shared sections from `PalletDetailShared.tsx`
  - Current qty snapshot (available, on hand, on order, on receipt)
  - Hold status when applicable
  - **Activity log** — chronological journey; **location codes clickable** → blueprint + bin panel
  - **History detail** — expanded records with **operator** on every entry
  - Clickable **RCV-** / **ORD-** refs open load breakdown
- **Expand:** arrow (top-right) or “Open full PLT view” → **PalletDetailPage** (compact header row: back · PLT ID · location · badge; single scroll area)
- Full page: numbered activity timeline, 2-column detail grids, back button returns to prior module (`palletDetailReturnModule`)

### Warehouse Actions (sidebar flyout)
- Grouped menu: Movement, Inventory, Holds, Quality & client, Reporting & other
- **Navigate** actions switch module (e.g. Release hold → Holds, File report → Reports)
- **Form** actions open `WarehouseActionDialog` — **Comments required** before Submit (disabled until filled)
- Full-screen **scrim + blur** when menu open; menu hover uses **~200ms delay** and light highlight (not instant dark invert)
- Feedback toast at bottom of screen (not in narrow sidebar)

### Bin Visibility
- **Area selector:** rack aisle chips **or** instage **or** outstage (same dropdown as work queue blueprint)
- Rack mode: vertical blueprint, bays 01–38 as even/odd pairs with dashed walk-aisle column
- Staging mode: `StagingDockBlueprint` (see above)
- Bin cells (rack): **emerald = available (open)**, **blue = occupied** — no third grey state
- Aisle header counts: open + occupied (aligned with green cells)
- **No color legend** row above blueprint; aisle dropdown shows **aisle number only** (no “· N open” suffix)
- Selected bin: `ring-2 ring-slate-900`
- Clicking a bin or staging pallet opens the **bin details panel** inline to the right of the blueprint
- Blueprint and panel share `max-h-[48rem]` container; each scrolls independently

### Bin Details Panel
- **Integrated into the blueprint** — not a floating overlay or fixed drawer
- Resizable: drag left edge, 320–760px, default 460px, persisted in `localStorage` key `binsight-bin-panel-width`
- Header: "Bin details" label + location code h2 + status badge + **expand arrow** (full pallet page) + "View/Hide Bin History" link + X close
- **Actions section** (permission-aware, shown first):
  - Occupied bins: View inventory details, View location history, **Open full pallet view**
  - All bins (with `request_adjustments`): Report misplaced stock → inline form
- **Location section:** code, status, aisle/bay/level/position (rack) or dock door (staging)
- **Available callout:** prompts physical verification walk when on empty feed
- **Pallet sections** (occupied / staging): shared `PalletDetailShared` — identity, dates, qty breakdown, hold, activity log, history detail
- **Activity log:** each location in the journey is clickable → focuses blueprint + reopens panel at that location
- **RCV- / ORD-** refs in identity or staging context → load reference breakdown panel
- **Bin History:** coloured action-type badges (RECEIPT/emerald, MOVE/blue, ADJUSTMENT/amber, etc.), left-border timeline connector, pallet ID in subline, **operator** on each record
- **Report form:** location (fixed when opened from bin), report type, details, optional pallet ID / suspected client / item; submits to Stock Reports queue

### Inventory Lookup
- Free-text search scans: item ID, pallet ID, client code, product description, bin code, client name, **receipt ref (RCV-)**, **order ref (ORD-)**
- Result cards: `ProductCardLines` + QOH + package details + "Matched on" badge
- **RCV-/ORD- matches** open load reference breakdown on work queue view (not bin visibility)
- "Jump to bin →" opens **Bin Visibility** at that location

### Location History
- Manual lookup by location code input
- History cards: action badge + date + `ProductCardLines` + qty/note + **operator**

### Investigation Item Counts (module id `cycle-count`)
**Terminology:** Floor **investigation item counts** after order picks — not periodic WMS cycle counts.

**Summary filters (multi-select, OR):** Open (after pick) · Approve count · Discrepancies · Resolved · Total

**List sorting:** Three independent axes via `ListSortAxes` — Date, Priority (or Status on reports / Qty on holds), Location (each: off / asc / desc). Signed confirmed variance: **positive = over, negative = short**.

**Open tasks (pick-triggered only):**
- Created with `pickOrderId`, `pickedBy`, `pickedAt`
- Card shows blue "Triggered by order pick" line
- **Start investigation** → In Progress → enter **Investigation count (EA)** → **Submit count**
- Match expected → status `Counted`, pending IC approval
- Variance → status `Discrepancy` with over/short label

**Counted (matches expected):**
- **Approve count** → `approveInvestigationCount` → Resolved

**Discrepancy:**
- **Confirm discrepancy** / **Delete discrepancy** open review form
- Review action dropdown (investigation, adjustment, counting error, etc.)
- Signed **Confirmed variance (EA)** on confirm; **Corrected count** on dismiss
- Required **Review findings** comment
- Confirm → Resolved; Delete → back to `Counted` with zero variance

**Personnel:** assignedTo, countedBy/At, resolvedBy/At on discrepancy closeout

### Stock Holds
- ~40 hold records from stock-on-hand
- Multi-select summary: Active, Pending release, Serious (+ filters: Customer, Hold code only — **no hold status dropdown**)
- Serious holds (RECALL, EXP, DAMAGED, QA): red card + red badge
- Non-serious holds (including RETAIN, RETURN): standard slate card
- Hold card: hold ID header + `ProductCardLines` + hold code badges + reason/meta
- `holdStatus` badge shown only when status is **not** "Active"
- **No release eligibility field** — removed entirely
- **No release request buttons** — module is monitoring-only

### Location Availability
- Shows bin locations the WMS currently reports as **available**
- "How to use this" explainer: export check sheet, walk aisles, file a report if product found where it should not be
- Refresh available locations button
- Metric cards: Available locations count, Aisle range
- Export verification check sheet (gated by `export_reports`): CSV with columns Location, System Status, Physically Occupied? (Y/N), Item/Pallet Found, Checked By, Notes
- DataTable: Available Locations
- **No occupied-conflict or unrecorded-stock metrics** — those concepts were removed from the UI

### Stock Reports
- Scenario-first **StockReportForm** (location → scenario → note → optional pallet/item/lot lookup)
- Multi-select summary: Unresolved · Under investigation · Resolved · Total (default list = unresolved only)
- **No status dropdown** — status filtering via summary cards only
- Report card layout: reporter header | **ProductCardLines** | **Comment** column (side-by-side on wide screens)
- `ProductCardLines` order: client code → item — DESCRIPTION (caps) → lot → highlighted pallet → location
- Resolution actions (gated by `request_adjustments`): Start investigation → Mark resolved
- Seeded reports use new ID formats and optional `clientCode` field

---

## UI Design Rules

**Flat 2D — no shadows anywhere.** No `shadow-*` classes, no drop shadows, no elevation.

**Colour conventions:**

| Use | Colour |
|-----|--------|
| Available / success | `emerald` |
| Occupied / info | `blue` |
| Warnings / open reports / discrepancies | `amber` |
| Serious holds / errors | `red` |
| Neutral / unknown | `slate` |
| Selected / active state | `slate-900` (dark) |
| Page background | `bg-slate-200` |
| Module workspace | `bg-slate-50` + `border-2 border-slate-300` (`.module-workspace`) |
| Module panel | `bg-white` + `border-2 border-slate-300` (`.module-panel`) |
| Cards / panels | `bg-white border border-slate-200` |

**Typography** (utility classes in `index.css`):
- `.type-section-label` — section headers (uppercase, semibold)
- `.type-detail-label` — field labels (11px uppercase)
- `.type-detail-value` — field values (sm medium, slate-900)
- `.type-muted` — supporting copy (xs slate-500)
- Legacy inline Tailwind equivalents still appear in older components

**Status badge style:** `rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase`

**Rounding:** `rounded-xl` for cards/inputs, `rounded-2xl` for section panels, `rounded-full` for badges/chips.

**Avoid:**
- Marketing language or landing-page aesthetics
- Emojis
- Decorative gradients (legacy hero card only, if re-enabled)
- Heavy card padding — list cards use tighter spacing; pallet ID on soft `slate-100` badge (not black pill)
- Generic "ACTIVE" badges — only show operationally meaningful statuses
- "Release eligible" concept — removed, do not re-add
- Auto-derived "occupied conflict" or "unrecorded stock" bin statuses — removed; use human stock reports instead

---

## Status Labelling Rules

- Only show status labels that carry specific operational meaning
- Do not show "ACTIVE" as a badge on module cards or hold cards
- `holdStatus === "Active"` is suppressed in the hold card UI; "Pending Release" is shown
- Bin status labels: **Available** and **Occupied** only (`binDetails.ts`)
- Misplaced/unexpected stock is surfaced via **Stock Reports**, not bin colour coding

**WMS UI abbreviations** (`wmsLabels.ts`):
- User-facing copy uses **PLT** / **PLT ID** instead of “pallet” where space matters (queue counts, panel headers, form labels, staging badges)
- Internal field names (`palletId`, component names) unchanged
- Count helper: `formatPltCount(n)` → `"3 PLT"`

---

## Known Omissions / Not Yet Implemented

| Item | Notes |
|------|-------|
| `request_hold_release` permission | Defined and granted to demo user but no UI uses it — hold module is monitoring-only |
| `fetchBinStatusSummary` / `BinStatusSummary` | Type and service exist; not rendered in current shell |
| `DashboardHeader` / `DashboardSnapshot` / `OperationModules` | Legacy; not mounted by `App.tsx` |
| Logout button | No-op — no auth system |
| Manual upload mode | Removed from UI; `parseCsv.ts` and `parseExcel.ts` kept for future use |
| `DataTable` component | Minimal — shows first 12 rows, two columns only |
| Legacy conflict plumbing | `removedMatches`, `OccupiedConflict`, `fetchOccupiedConflicts` still in codebase internally; not user-facing |

---

## Pending Tasks / Possible Next Steps

- Wire `request_hold_release` to a hold status update action in the Stock Holds module
- **Guided putaway task flow** (frontend-only mock): queue → confirm location → move PLT instage → rack in `wmsApi`
- Rename internal `cycle-count` module id / `CycleCount*` types to `investigation-count` for code clarity (UI already says investigation)
- Auto-create investigation task when WMS pick completes (currently mock-seeded only)
- Expand `DataTable` pagination; separate floor-staff vs IC permissions for report file vs resolve
- Remove legacy `removedMatches` / `OccupiedConflict` internal plumbing if unused

---

## Build Status

- `npx tsc --noEmit` — passes with zero errors
- `npm run build` — passes, ~382KB JS bundle

---

## Changelog

### Since original brief

1. **App reframed** as a warehouse operations console (not centered on empty-location cross-checks).
2. **Removed conflict/unrecorded bin statuses** — rack is available (green) or occupied (blue) only.
3. **Added DashboardSnapshot**, Location Availability rename, Stock Reports module, `StockReportForm`, `historyActions.ts`.
4. **Wired `request_adjustments`** for filing/resolving reports from bin panel.

### Session update (May 2026 — since last `PROJECT_BRIEF.md` edit)

**Shell & navigation**
- Icon **sidebar** + **toolbar**; default landing = **Work queue** (reports, holds, investigations) with embedded heatmap.
- Removed stacked dashboard hero/KPI/module-card-first flow from primary UX (legacy components remain in repo).

**Blueprint & WMS display**
- ~**72%** locations with stock; empty feed ~17%; open/occupied counts on aisle headers.
- Dropped grey **"No WMS record"** rack cell; non-stock slots show as **open/available**.

**Mock data & IDs**
- Pallets: **8-digit** `CC II SSSS` style (`10030442`, etc.), chronological per client/SKU.
- Items: **`LO10001`** / **`LE10003`** / **`KE10002`** (2-letter client + number).
- Lots: numeric **`240345`** (display strips erroneous `LOT-` prefix).
- Investigation tasks: **`INV-`** IDs; open tasks tied to **`ORD-`** pick orders and picker name/time.

**Shared list UX (`FilterSummaryCard`, `ListSortAxes`, `ProductCardLines`)**
- **Multi-select** summary filters (OR) on holds, reports, investigations.
- **Three independent sort dropdowns** (date, middle axis, location).
- Unified product card: client code → item — **DESCRIPTION** (uppercase) → lot → **pallet badge** → location.

**Stock reports**
- Scenario-driven form; **Expected stock not found** type; comments **beside** product details on cards.
- Removed standalone status dropdown (use summary cards).

**Investigation item counts** (renamed from "cycle count" in UI)
- Open investigations **only after order pick** (picker + order + timestamp on card).
- Floor user **enters count qty**; match → **Approve count**; variance → **Confirm** / **Delete discrepancy** with review form.
- Signed confirmed variance: **+ over / − short**; personnel fields on count/discrepancy resolution.
- Services: `submitCycleCountResult`, `approveInvestigationCount`, `reviewCycleCountDiscrepancy`.

**Stock holds**
- Removed hold status filter dropdown (summary cards for Active / Pending release / Serious).

**Copy/config**
- `investigationCountCopy.ts`, `warehouseNav.ts`, `palletLabels.ts`, `investigationCountWorkflow.ts`, `cycleCountVariance.ts`, `listSort.ts`.

### Session update (May 2026 — UI shell, work queue, actions)

**Toolbar & branding**
- **BinSightLogo** in header; greeting + **live date/time** on one line; **Last updated:** (not “WMS sync”); **refresh icon only**; removed Online pill
- Removed aisle From/To from toolbar (fixed 601–622 in code)

**Layout & contrast**
- **Viewport-locked** app (`h-dvh`, no document scroll); internal panels scroll
- **`slate-200`** page + **module-workspace** / **module-panel** for clearer separation

**Work queue**
- **Collapsible** section headers; queue row opens **Reports / Holds / Counts** module with record highlight — not blueprint side panel
- **Blueprint restored on main page** (queue left, map right); bin click still opens panel on home view

**Sidebar**
- **Warehouse Actions** flyout at top (`warehouseActions.ts`, portal + scrim, delayed hover)
- Transaction forms require **Comments**; navigate-only actions switch module
- Nav label **Counts** (was Investigation); action toasts at bottom, not in sidebar

**Blueprint polish**
- Removed top **Open/Occupied legend**; aisle select without per-aisle open count in dropdown

**index.css**
- `.module-panel`, `.module-workspace`, `.menu-item-hover-delay`

### Session update (May 2026 — staging, pallet journey, work queue)

**Instage / outstage**
- Open-floor dock staging at 4 doors per zone; WMS tracks scanned pallets only (no empty slot grid)
- Location codes: `IN-D{door}-{pos}`, `OUT-D{door}-{pos}`; one client + shared RCV/ORD per door
- `StagingDockBlueprint`, `warehouseStagingBlueprint.ts`, `stagingLocations.ts`
- Mock seed bumped to `mulberry32(20260601)`; multi-stop pallet journey history with operators

**Load reference workflow**
- Clickable **RCV-** / **ORD-** → `LoadReferenceBreakdownPanel` (client, lines, pallet/qty totals)
- `searchLoadReferences()` in wmsApi; inventory lookup matches receipt/order refs
- Work queue sections: **Awaiting putaway**, **Staged for outbound** → blueprint zone + breakdown

**Pallet detail UX**
- `PalletDetailShared.tsx`: qty snapshot, hold, activity log, history detail (`layout: compact | page`)
- Activity log locations clickable → blueprint focus; operator on every history record
- **PalletDetailPage** full-screen spread view; expand from bin panel arrow / link
- `fetchPalletMovementHistory` wired via `usePalletMovementHistory` hook

**Blueprint area selector**
- Dropdown switches rack aisle vs instage vs outstage (mutually exclusive views)
- Staging: fixed-width centered pallet chips, full 8-digit IDs, no capacity UI

**Branding**
- Blue accent theme (logo, header stripe, primary links); emerald retained for available/success states
- `.type-*` typography utilities in `index.css`

### Session update (May 2026 — polish, PLT labels, seed report fixes)

**Bug fixes**
- **Work queue** now forwards `onExpandPalletDetail` + `onActivityLocationSelect` to embedded heatmap (blue expand arrow was missing on default view)
- **PalletDetailPage** header compacted — removed duplicate product card; single toolbar row + one scroll area
- **Seeded stock reports** aligned with mock snapshot so blueprint matches report location/PLT per scenario (see table under Service Layer)

**PLT terminology**
- `wmsLabels.ts`: `WMS_LABEL.plt`, `WMS_LABEL.pltId`, `formatPltCount()`
- UI copy across queue, staging, panels, forms, warehouse actions uses **PLT** shorthand

**Product direction (not implemented)**
- Owner specialty is **frontend / ops UX**; backend remains mock service layer
- Recommended next feature: **guided putaway task** end-to-end in UI

**Dev environment**
- Project path: `/Users/school/Downloads/binsight-warehouse-heatmap` (local)
- GitHub target: `reemsalti/binsight` (public) — push via `scripts/push-to-github.sh` after Xcode CLT + `gh` auth
- Repo hygiene: `.gitignore`, `.nvmrc`, pinned deps in `package.json`, CI workflow in `.github/workflows/ci.yml`
- `gh` CLI at `~/.local/bin/gh`; authenticated as **reemsalti**
