import { useState } from "react";
import type { WarehouseAction, WarehouseActionId } from "../../config/warehouseActions";

type Props = {
  action: WarehouseAction;
  onClose: () => void;
  onSubmitted: (message: string) => void;
};

type FieldSpec = {
  id: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "textarea";
};

const ACTION_FIELDS: Partial<Record<WarehouseActionId, FieldSpec[]>> = {
  relocate: [
    { id: "palletId", label: "PLT ID", placeholder: "10030442" },
    { id: "fromLocation", label: "From location", placeholder: "601A011" },
    { id: "toLocation", label: "To location", placeholder: "601B021" },
  ],
  bin_transfer: [
    { id: "palletId", label: "PLT ID", placeholder: "11030018" },
    { id: "fromLocation", label: "From location" },
    { id: "toLocation", label: "To location" },
    { id: "qty", label: "Quantity (EA)", type: "number", placeholder: "576" },
  ],
  putaway: [
    { id: "palletId", label: "PLT ID" },
    { id: "fromLocation", label: "From instage location", placeholder: "IN-D01-01" },
    { id: "location", label: "Putaway rack location", placeholder: "602-01-A01" },
    { id: "receiptRef", label: "Receipt / ASN", placeholder: "RCV-24018" },
  ],
  adjustment: [
    { id: "location", label: "Location" },
    { id: "palletId", label: "PLT ID (optional)" },
    { id: "qtyDelta", label: "Adjustment (+/− EA)", type: "number", placeholder: "-12" },
    { id: "reason", label: "Reason", type: "textarea", placeholder: "Count variance confirmed" },
  ],
  place_hold: [
    { id: "palletId", label: "PLT ID" },
    { id: "holdCode", label: "Hold code", placeholder: "QA, DAMAGED, RECALL…" },
    { id: "reason", label: "Reason", type: "textarea" },
  ],
  damage_client: [
    { id: "clientCode", label: "Client code", placeholder: "LOREALCA" },
    { id: "palletId", label: "PLT ID" },
    { id: "details", label: "Damage details", type: "textarea" },
  ],
  qa_hold: [
    { id: "palletId", label: "PLT ID" },
    { id: "lotNumber", label: "Lot number", placeholder: "240345" },
    { id: "note", label: "Inspection note", type: "textarea" },
  ],
  return_vendor: [
    { id: "palletId", label: "PLT ID" },
    { id: "clientCode", label: "Client code" },
    { id: "reason", label: "Return reason", type: "textarea" },
  ],
  scrap: [
    { id: "palletId", label: "PLT ID" },
    { id: "location", label: "Location" },
    { id: "qty", label: "Quantity to scrap (EA)", type: "number" },
    { id: "reason", label: "Reason", type: "textarea" },
  ],
  reprint_label: [
    { id: "palletId", label: "PLT ID" },
    { id: "copies", label: "Label copies", type: "number", placeholder: "1" },
  ],
  audit_by_operator: [
    { id: "operatorId", label: "Operator ID or name", placeholder: "J. Martinez" },
    { id: "dateFrom", label: "From date", placeholder: "2026-05-01" },
    { id: "dateTo", label: "To date", placeholder: "2026-05-29" },
    {
      id: "transactionTypes",
      label: "Transaction types",
      placeholder: "Putaway, pick, move, adjustment…",
    },
  ],
  putaway_audit: [
    { id: "aisleFrom", label: "Aisle from", type: "number", placeholder: "601" },
    { id: "aisleTo", label: "Aisle to", type: "number", placeholder: "622" },
    { id: "receiptRef", label: "Receipt / ASN (optional)", placeholder: "RCV-24018" },
    { id: "sampleSize", label: "Sample size", type: "number", placeholder: "25" },
  ],
  relocation_audit: [
    { id: "aisleFrom", label: "Aisle from", type: "number", placeholder: "601" },
    { id: "aisleTo", label: "Aisle to", type: "number", placeholder: "622" },
    { id: "dateFrom", label: "From date", placeholder: "2026-05-01" },
    { id: "dateTo", label: "To date", placeholder: "2026-05-29" },
  ],
  pick_accuracy_audit: [
    { id: "operatorId", label: "Picker", placeholder: "M. Diaz" },
    { id: "orderRef", label: "Order reference", placeholder: "ORD-48012" },
    { id: "auditDate", label: "Audit date", placeholder: "2026-05-29" },
  ],
  receipt_audit: [
    { id: "receiptRef", label: "Receipt / ASN", placeholder: "RCV-24018" },
    { id: "clientCode", label: "Client code", placeholder: "LEGOTOYS" },
    { id: "dockDoor", label: "Dock door (optional)", placeholder: "Door 3" },
  ],
};

export function WarehouseActionDialog({ action, onClose, onSubmitted }: Props) {
  const fields = ACTION_FIELDS[action.id] ?? [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [comments, setComments] = useState("");
  const [commentsError, setCommentsError] = useState(false);

  const commentsTrimmed = comments.trim();
  const canSubmit = commentsTrimmed.length > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentsTrimmed) {
      setCommentsError(true);
      return;
    }
    onSubmitted(
      `${action.label} recorded in demo mode. In production this would post to the WMS.`,
    );
    onClose();
  };

  const Icon = action.icon;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-labelledby="warehouse-action-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-5"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-800">
            <Icon size={20} />
          </span>
          <div className="min-w-0">
            <h2 id="warehouse-action-title" className="type-heading">
              {action.label}
            </h2>
            <p className="mt-0.5 type-muted">{action.description}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {fields.map((field) => (
            <label key={field.id} className="block">
              <span className="type-label">
                {field.label}
              </span>
              {field.type === "textarea" ? (
                <textarea
                  className="type-control mt-1 w-full"
                  rows={3}
                  placeholder={field.placeholder}
                  value={values[field.id] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.id]: event.target.value,
                    }))
                  }
                />
              ) : (
                <input
                  className="type-control mt-1 w-full"
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  value={values[field.id] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.id]: event.target.value,
                    }))
                  }
                />
              )}
            </label>
          ))}

          <label className="block border-t border-slate-200 pt-3">
            <span className="type-label">
              Comments <span className="text-red-600">*</span>
            </span>
            <textarea
              required
              className={`type-control mt-1 w-full ${
                commentsError
                  ? "border-red-400 bg-red-50 focus:border-red-500"
                  : "border-slate-200"
              }`}
              rows={3}
              placeholder="Required — explain why this action is being performed"
              value={comments}
              aria-invalid={commentsError}
              aria-describedby={
                commentsError ? "warehouse-action-comments-error" : undefined
              }
              onChange={(event) => {
                setComments(event.target.value);
                if (commentsError && event.target.value.trim()) {
                  setCommentsError(false);
                }
              }}
            />
            {commentsError && (
              <p
                id="warehouse-action-comments-error"
                className="mt-1 text-xs font-medium text-red-700"
              >
                Comments are required before submitting.
              </p>
            )}
          </label>
        </div>

        <p className="type-muted mt-3">
          Simulated workflow — uses the mock service layer in this portfolio build.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="type-btn border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="type-btn bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
