import { useCallback, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  lookupStockByItemAndLot,
  lookupStockByPalletId,
} from "../services/wmsApi";
import { ProductCardLines } from "./ProductCardLines";
import {
  defaultReportTypeForBin,
  getScenarioConfig,
  STOCK_REPORT_SCENARIOS,
} from "../utils/stockReportScenarios";
import type {
  BinStatus,
  Filters,
  StockOnHandRecord,
  StockReportQuantityScope,
  StockReportQuantityUom,
  StockReportType,
} from "../types";
import { WMS_LABEL } from "../utils/wmsLabels";

export type StockReportFormValues = {
  locationCode: string;
  reportType: StockReportType;
  note: string;
  palletId?: string;
  suspectedClient?: string;
  suspectedItemId?: string;
  lotNumber?: string;
  productDescription?: string;
  wmsBinCode?: string;
  reportQuantityScope?: StockReportQuantityScope;
  reportedQuantity?: number;
  reportedQuantityUom?: StockReportQuantityUom;
};

type Props = {
  fixedLocation?: string;
  wmsStatusLabel?: string;
  wmsBinStatus?: BinStatus;
  filters?: Filters;
  isSubmitting: boolean;
  onSubmit: (values: StockReportFormValues) => void;
  onCancel?: () => void;
};

type QuantityChoice = "unspecified" | "full" | "partial";

export function StockReportForm({
  fixedLocation,
  wmsStatusLabel,
  wmsBinStatus,
  filters,
  isSubmitting,
  onSubmit,
  onCancel,
}: Props) {
  const [reportType, setReportType] = useState<StockReportType>(() =>
    defaultReportTypeForBin(wmsBinStatus, wmsStatusLabel),
  );
  const [locationCode, setLocationCode] = useState(fixedLocation ?? "");
  const [note, setNote] = useState("");

  const [identifyExpanded, setIdentifyExpanded] = useState(false);
  const [palletInput, setPalletInput] = useState("");
  const [itemCodeInput, setItemCodeInput] = useState("");
  const [lotInput, setLotInput] = useState("");
  const [manualClient, setManualClient] = useState("");
  const [manualDescription, setManualDescription] = useState("");

  const [palletLookupMessage, setPalletLookupMessage] = useState("");
  const [productLookupMessage, setProductLookupMessage] = useState("");
  const [isPalletLookingUp, setIsPalletLookingUp] = useState(false);
  const [isProductLookingUp, setIsProductLookingUp] = useState(false);
  const [productCandidates, setProductCandidates] = useState<StockOnHandRecord[]>(
    [],
  );
  const [identifiedStock, setIdentifiedStock] = useState<StockOnHandRecord | null>(
    null,
  );

  const [quantityChoice, setQuantityChoice] =
    useState<QuantityChoice>("unspecified");
  const [reportedQuantity, setReportedQuantity] = useState("");
  const [quantityUom, setQuantityUom] = useState<StockReportQuantityUom>("CASE");

  const scenario = useMemo(() => getScenarioConfig(reportType), [reportType]);

  const maxCases = identifiedStock?.quantityOnHand ?? 0;
  const maxEaches = identifiedStock?.totalEaches ?? 0;
  const maxForUom = quantityUom === "CASE" ? maxCases : maxEaches;

  const parsedReportedQty = Number(reportedQuantity);

  const quantityValid =
    !scenario.showQuantity ||
    !scenario.quantityRequired ||
    quantityChoice === "full" ||
    quantityChoice === "unspecified" ||
    (quantityChoice === "partial" &&
      parsedReportedQty > 0 &&
      (!identifiedStock || parsedReportedQty <= maxForUom));

  const canSubmit =
    Boolean(locationCode.trim() && note.trim()) &&
    quantityValid &&
    !isSubmitting &&
    !isPalletLookingUp &&
    !isProductLookingUp;

  const applyIdentifiedStock = useCallback(
    (stock: StockOnHandRecord) => {
      setIdentifiedStock(stock);
      setProductCandidates([]);
      setPalletInput(stock.palletId);
      setItemCodeInput(stock.itemId);
      setLotInput(stock.lotNumber);
      setManualClient(stock.clientName);
      setManualDescription(stock.productDescription);
      if (!fixedLocation) {
        setLocationCode((current) => current || stock.binCode);
      }
      setPalletLookupMessage("");
      setProductLookupMessage("");
    },
    [fixedLocation],
  );

  const clearIdentifiedStock = useCallback(() => {
    setIdentifiedStock(null);
    setProductCandidates([]);
    setPalletLookupMessage("");
    setProductLookupMessage("");
  }, []);

  const handlePalletLookup = useCallback(async () => {
    const query = palletInput.trim();
    if (!query) {
      setPalletLookupMessage(`Enter a ${WMS_LABEL.pltId} to look up.`);
      return;
    }

    setPalletLookupMessage("");
    setIsPalletLookingUp(true);
    setProductCandidates([]);

    try {
      const match = await lookupStockByPalletId(query, filters);
      if (match) {
        applyIdentifiedStock(match);
        setPalletLookupMessage("WMS record loaded.");
      } else {
        clearIdentifiedStock();
        setPalletLookupMessage(
          "No WMS match for this PLT. You can still file the report or try item and lot below.",
        );
      }
    } finally {
      setIsPalletLookingUp(false);
    }
  }, [applyIdentifiedStock, clearIdentifiedStock, filters, palletInput]);

  const handleProductLookup = useCallback(async () => {
    const item = itemCodeInput.trim();
    const lot = lotInput.trim();
    if (!item || !lot) {
      setProductLookupMessage("Enter both item code and lot number.");
      return;
    }

    setProductLookupMessage("");
    setIsProductLookingUp(true);
    setProductCandidates([]);

    try {
      const matches = await lookupStockByItemAndLot(item, lot, filters);
      if (matches.length === 1) {
        applyIdentifiedStock(matches[0]);
        setProductLookupMessage("WMS record loaded.");
      } else if (matches.length > 1) {
        setIdentifiedStock(null);
        setProductLookupMessage("Select the PLT that matches what you see.");
      } else {
        clearIdentifiedStock();
        setProductLookupMessage(
          "No WMS match — enter client or description manually if needed.",
        );
      }
    } finally {
      setIsProductLookingUp(false);
    }
  }, [applyIdentifiedStock, clearIdentifiedStock, filters, itemCodeInput, lotInput]);

  function buildNote(userNote: string): string {
    const parts: string[] = [];

    if (wmsStatusLabel && fixedLocation) {
      parts.push(
        `WMS snapshot for ${fixedLocation}: ${wmsStatusLabel}. Floor observation below.`,
      );
    }

    if (quantityChoice === "full") {
      parts.push(
        identifiedStock
          ? `Quantity: full PLT (${identifiedStock.quantityOnHand} CASE on hand)`
          : "Quantity: full PLT",
      );
    } else if (quantityChoice === "partial" && parsedReportedQty > 0) {
      parts.push(`Quantity: ${parsedReportedQty} ${quantityUom} (estimate)`);
    }

    if (manualClient.trim() || manualDescription.trim()) {
      const manual = [
        manualClient.trim() && `Client: ${manualClient.trim()}`,
        manualDescription.trim() && `Product: ${manualDescription.trim()}`,
      ]
        .filter(Boolean)
        .join(" · ");
      if (manual) parts.push(manual);
    }

    parts.push(userNote.trim());
    return parts.join("\n\n");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const reportQuantityScope: StockReportQuantityScope | undefined =
      quantityChoice === "full"
        ? "full"
        : quantityChoice === "partial"
          ? "partial"
          : undefined;

    onSubmit({
      locationCode: locationCode.trim(),
      reportType,
      note: buildNote(note),
      palletId: palletInput.trim() || identifiedStock?.palletId,
      suspectedClient:
        identifiedStock?.clientName || manualClient.trim() || undefined,
      suspectedItemId:
        identifiedStock?.itemId || itemCodeInput.trim() || undefined,
      lotNumber:
        identifiedStock?.lotNumber || lotInput.trim() || undefined,
      productDescription:
        identifiedStock?.productDescription ||
        manualDescription.trim() ||
        undefined,
      wmsBinCode: identifiedStock?.binCode,
      reportQuantityScope,
      reportedQuantity:
        quantityChoice === "partial" ? parsedReportedQty : undefined,
      reportedQuantityUom:
        quantityChoice === "partial" ? quantityUom : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <Field label="What are you reporting?">
          <select
            value={reportType}
            onChange={(event) => {
              const nextType = event.target.value as StockReportType;
              setReportType(nextType);
              const nextScenario = getScenarioConfig(nextType);
              setQuantityChoice(
                nextScenario.quantityRequired ? "partial" : "unspecified",
              );
              setReportedQuantity("");
              if (nextScenario.encourageProductId) {
                setIdentifyExpanded(true);
              }
            }}
            className="w-full type-control font-medium text-slate-900"
          >
            {STOCK_REPORT_SCENARIOS.map((option) => (
              <option key={option.type} value={option.type}>
                {option.title}
              </option>
            ))}
          </select>
        </Field>
        <p className="mt-2 type-text">{scenario.description}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        {wmsStatusLabel && fixedLocation && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 type-text">
            <span className="font-semibold text-slate-800">WMS at this bin:</span>{" "}
            {wmsStatusLabel}
          </div>
        )}

        <Field label={scenario.locationLabel}>
          <input
            value={locationCode}
            onChange={(event) => setLocationCode(event.target.value)}
            placeholder={scenario.locationPlaceholder}
            disabled={Boolean(fixedLocation)}
            className="w-full type-control font-mono disabled:bg-slate-100 disabled:text-slate-600"
          />
        </Field>

        <Field label={scenario.noteLabel}>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={scenario.notePlaceholder}
            rows={3}
            className="w-full type-control"
          />
        </Field>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <button
          type="button"
          onClick={() => setIdentifyExpanded((open) => !open)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="type-label">
            Identify product (optional)
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {identifyExpanded ? "Hide" : "Show"}
            {scenario.encourageProductId ? " · recommended" : ""}
          </span>
        </button>

        {identifyExpanded && (
          <div className="mt-4 space-y-4">
            <Field label={WMS_LABEL.pltId}>
              <div className="flex flex-wrap gap-2">
                <input
                  value={palletInput}
                  onChange={(event) => {
                    setPalletInput(event.target.value);
                    setPalletLookupMessage("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handlePalletLookup();
                    }
                  }}
                  placeholder="11030452"
                  className="min-w-[10rem] flex-1 type-control font-mono"
                />
                <button
                  type="button"
                  onClick={() => void handlePalletLookup()}
                  disabled={isPalletLookingUp || !palletInput.trim()}
                  className="type-btn gap-1.5 border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-60"
                >
                  <Search size={15} />
                  {isPalletLookingUp ? "Looking up…" : "Look up"}
                </button>
              </div>
              {palletLookupMessage && (
                <p className="mt-1.5 type-text">{palletLookupMessage}</p>
              )}
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Item code">
                <input
                  value={itemCodeInput}
                  onChange={(event) => setItemCodeInput(event.target.value)}
                  placeholder="e.g. KE10002"
                  className="w-full type-control"
                />
              </Field>
              <Field label="Lot number">
                <input
                  value={lotInput}
                  onChange={(event) => setLotInput(event.target.value)}
                  placeholder="e.g. 240118"
                  className="w-full type-control font-mono"
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => void handleProductLookup()}
              disabled={
                isProductLookingUp || !itemCodeInput.trim() || !lotInput.trim()
              }
              className="type-btn gap-1.5 border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-60"
            >
              <Search size={15} />
              {isProductLookingUp ? "Searching…" : "Look up item and lot"}
            </button>
            {productLookupMessage && (
              <p className="type-text">{productLookupMessage}</p>
            )}

            {productCandidates.length > 1 && (
              <ul className="space-y-2">
                {productCandidates.map((candidate) => (
                  <li key={candidate.palletId}>
                    <button
                      type="button"
                      onClick={() => applyIdentifiedStock(candidate)}
                      className="type-text w-full rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-slate-400"
                    >
                      <ProductCardLines
                        data={{
                          clientCode: candidate.clientCode,
                          itemId: candidate.itemId,
                          productDescription: candidate.productDescription,
                          lotNumber: candidate.lotNumber,
                          palletId: candidate.palletId,
                          locationCode: candidate.binCode,
                        }}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Client (manual)">
                <input
                  value={manualClient}
                  onChange={(event) => setManualClient(event.target.value)}
                  placeholder="Client name if unknown to WMS"
                  className="w-full type-control"
                />
              </Field>
              <Field label="Product description (manual)">
                <input
                  value={manualDescription}
                  onChange={(event) => setManualDescription(event.target.value)}
                  placeholder="What is on the label or cases?"
                  className="w-full type-control"
                />
              </Field>
            </div>
          </div>
        )}

        {identifiedStock && (
          <IdentifiedProductCard stock={identifiedStock} onClear={clearIdentifiedStock} />
        )}
      </section>

      {scenario.showQuantity && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="type-label">
            Quantity
            {scenario.quantityRequired ? " (required)" : " (optional)"}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {!scenario.quantityRequired && (
              <QuantityRadio
                name="qty-choice"
                checked={quantityChoice === "unspecified"}
                label="Not specified"
                onChange={() => {
                  setQuantityChoice("unspecified");
                  setReportedQuantity("");
                }}
              />
            )}
            <QuantityRadio
              name="qty-choice"
              checked={quantityChoice === "full"}
              label="Full PLT / all in location"
              onChange={() => {
                setQuantityChoice("full");
                setReportedQuantity("");
              }}
            />
            <QuantityRadio
              name="qty-choice"
              checked={quantityChoice === "partial"}
              label="Partial or estimate"
              onChange={() => setQuantityChoice("partial")}
            />
          </div>

          {quantityChoice === "partial" && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <Field label="Amount">
                <input
                  type="number"
                  min={1}
                  max={identifiedStock ? maxForUom : undefined}
                  value={reportedQuantity}
                  onChange={(event) => setReportedQuantity(event.target.value)}
                  className="w-28 type-control tabular-nums"
                />
              </Field>
              <Field label="Unit">
                <select
                  value={quantityUom}
                  onChange={(event) =>
                    setQuantityUom(event.target.value as StockReportQuantityUom)
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 type-control"
                >
                  <option value="CASE">CASE</option>
                  <option value="EA">EA</option>
                </select>
              </Field>
              {identifiedStock && (
                <p className="pb-2 type-muted">
                  WMS on hand: {maxForUom} {quantityUom}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="type-btn gap-2 bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit report"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="type-btn border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function QuantityRadio({
  name,
  checked,
  label,
  onChange,
}: {
  name: string;
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 type-emphasis">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function IdentifiedProductCard({
  stock,
  onClear,
}: {
  stock: StockOnHandRecord;
  onClear: () => void;
}) {
  return (
    <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="type-label text-emerald-900">WMS match</p>
        <button
          type="button"
          onClick={onClear}
          className="type-emphasis text-emerald-800 hover:text-emerald-950"
        >
          Clear
        </button>
      </div>
      <ProductCardLines
        className="mt-1"
        data={{
          clientCode: stock.clientCode,
          itemId: stock.itemId,
          productDescription: stock.productDescription,
          lotNumber: stock.lotNumber,
          palletId: stock.palletId,
          locationCode: stock.binCode,
        }}
      />
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block type-label">
        {label}
      </span>
      {children}
    </label>
  );
}
