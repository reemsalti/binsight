import { Map } from "lucide-react";
import { WarehouseHeatMap } from "../WarehouseHeatMap";
import { DashboardSectionHeader } from "../DashboardSectionHeader";
import type { StockReportFormValues } from "../StockReportForm";
import type { DemoPermission } from "../../mock-data/demoUser";
import type {
  BinDetails,
  Filters,
  LoadReferenceKind,
  LocationHistoryRecord,
  ProcessedResults,
  StockOnHandRecord,
} from "../../types";

type Props = {
  results: ProcessedResults | null;
  filters: Filters;
  stockLocationSet: Set<string>;
  stockRecords: StockOnHandRecord[];
  selectedLocation: string | null;
  onBinSelect: (locationCode: string) => void;
  binDetails: BinDetails | null;
  locationHistory: LocationHistoryRecord[];
  palletHistory: LocationHistoryRecord[];
  isBinDetailsLoading: boolean;
  isHistoryLoading: boolean;
  isPalletHistoryLoading: boolean;
  onCloseBinDetails: () => void;
  onLoadHistory: () => void;
  onSubmitReport: (values: StockReportFormValues) => Promise<void>;
  isSubmittingReport: boolean;
  reportSubmittedFor: string | null;
  permissions: DemoPermission[];
  blueprintFocusLocation: string | null;
  selectedLoadReference: { kind: LoadReferenceKind; reference: string } | null;
  onLoadReferenceSelect: (kind: LoadReferenceKind, reference: string) => void;
  onCloseLoadReference: () => void;
  onActivityLocationSelect: (locationCode: string) => void;
  onExpandPalletDetail: (locationCode: string) => void;
};

export function BinVisibilityModule(props: Props) {
  const { blueprintFocusLocation, selectedLocation, ...heatmapProps } = props;

  return (
    <section className="module-panel p-5">
      <DashboardSectionHeader
        title="Bin Visibility"
        description="Rack blueprint, bin status, and location drill-down across aisles."
      />
      <div className="mb-4 mt-4 flex items-center gap-2">
        <Map size={18} />
        <h3 className="type-heading">
          Warehouse Rack Utilization Map
        </h3>
      </div>
      <WarehouseHeatMap
        {...heatmapProps}
        selectedLocation={selectedLocation}
        focusLocation={blueprintFocusLocation ?? selectedLocation}
      />
    </section>
  );
}
