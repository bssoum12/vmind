export interface MultiKpiItem {
  label: string;
  value: number;
  display: string;
  unit?: string;
  delta_24h?: number;
}

export interface MultiKpiResponse {
  ok: boolean;
  kpis: MultiKpiItem[];
  details: {
    selectedYear: number;
  };
}