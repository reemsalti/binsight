export type ProductCardLinesData = {
  clientCode: string;
  itemId?: string;
  productDescription?: string;
  lotNumber?: string;
  palletId?: string;
  locationCode: string;
};

const CLIENT_NAME_TO_CODE: Record<string, string> = {
  "L'ORÉAL": "LOREALCA",
  "L'OREAL": "LOREALCA",
  LEGO: "LEGOTOYS",
  "KELLOGG'S": "KELLOGGS",
  KELLOGGS: "KELLOGGS",
};

const ITEM_PREFIX_TO_CLIENT_CODE: Record<string, string> = {
  LO: "LOREALCA",
  LE: "LEGOTOYS",
  KE: "KELLOGGS",
};

/** Strip a leading LOT- prefix so the UI does not show "Lot LOT-…". */
export function formatLotDisplay(lotNumber?: string): string {
  if (!lotNumber?.trim()) return "Lot —";
  const normalized = lotNumber.trim().replace(/^LOT-/i, "");
  return `Lot ${normalized}`;
}

export function resolveClientCode(options: {
  clientCode?: string;
  clientName?: string;
  itemId?: string;
}): string {
  if (options.clientCode?.trim()) {
    return options.clientCode.trim().toUpperCase();
  }
  if (options.itemId && options.itemId.length >= 2) {
    const prefix = options.itemId.slice(0, 2).toUpperCase();
    const fromItem = ITEM_PREFIX_TO_CLIENT_CODE[prefix];
    if (fromItem) return fromItem;
  }
  if (options.clientName?.trim()) {
    const normalized = options.clientName.trim().toUpperCase();
    return CLIENT_NAME_TO_CODE[normalized] ?? normalized;
  }
  return "—";
}

type Props = {
  data: ProductCardLinesData;
  className?: string;
};

function formatItemLine(itemId?: string, productDescription?: string): string | null {
  const parts: string[] = [];
  if (itemId?.trim()) parts.push(itemId.trim());
  if (productDescription?.trim()) {
    parts.push(productDescription.trim().toUpperCase());
  }
  return parts.length ? parts.join(" — ") : null;
}

export function ProductCardLines({ data, className = "" }: Props) {
  const itemLine = formatItemLine(data.itemId, data.productDescription);
  const hasPallet = Boolean(data.palletId?.trim());

  return (
    <div className={`flex flex-col gap-0.5 leading-tight ${className}`.trim()}>
      <p className="type-label text-slate-600">{data.clientCode}</p>
      {itemLine ? <p className="type-emphasis">{itemLine}</p> : null}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="type-muted">{formatLotDisplay(data.lotNumber)}</span>
        {hasPallet ? (
          <span className="type-code inline-block rounded-md border border-slate-300 bg-slate-100 px-1.5 py-px">
            {data.palletId}
          </span>
        ) : (
          <span className="type-muted">PLT —</span>
        )}
      </div>
      <p className="type-code">{data.locationCode}</p>
    </div>
  );
}
