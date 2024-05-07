export interface SCTE35Type {
  blackout?: string;
  count?: number;
  cueIn?: string;
  cueOut?: string;
  duration?: number;
  elapsed?: number;
  id?: number;
  segne?: string;
  time?: number;
  type?: string;
  typeValue?: number;
  upid?: string;
  startDate?: string;
  plannedDuration?: number;
  endDate?: string;
}

export interface SCTE35Data extends SCTE35Type {
  data?: string;
  xProgramTimePosition?: number;
  xAssetId?: string;
  xSlotId?: string;
  scte35Out?: string;
  scte35Cmd?: string;
}

export const scte35Types: SCTE35Type[] = [
  { type: 'Not Indicated', typeValue: 0 },
  { type: 'Content Id', typeValue: 1 },
  { type: 'Program Start', typeValue: 16 },
  { type: 'Program End', typeValue: 17 },
  { type: 'Program Early Termination', typeValue: 18 },
  { type: 'Program Breakaway', typeValue: 19 },
  { type: 'Program Resumption', typeValue: 20 },
  { type: 'Program Runover Planned', typeValue: 21 },
  { type: 'Program Runover Unplanned', typeValue: 22 },
  { type: 'Program Overlap Start', typeValue: 23 },
  { type: 'Program Blackout Override', typeValue: 24 },
  { type: 'Program Start – In Progress', typeValue: 25 },
  { type: 'Chapter Start', typeValue: 32 },
  { type: 'Chapter End', typeValue: 33 },
  { type: 'Break Start', typeValue: 34 },
  { type: 'Break End', typeValue: 35 },
  { type: 'Opening Credit Start', typeValue: 36 },
  { type: 'Opening Credit End', typeValue: 37 },
  { type: 'Closing Credit Start', typeValue: 38 },
  { type: 'Closing Credit End', typeValue: 39 },
  { type: 'Provider Advertisement Start', typeValue: 48 },
  { type: 'Provider Advertisement End', typeValue: 49 },
  { type: 'Distributor Advertisement Start', typeValue: 50 },
  { type: 'Distributor Advertisement End', typeValue: 51 },
  { type: 'Provider Placement Opportunity Start', typeValue: 52 },
  { type: 'Provider Placement Opportunity End', typeValue: 53 },
  { type: 'Distributor Placement Opportunity Start', typeValue: 54 },
  { type: 'Distributor Placement Opportunity End', typeValue: 55 },
  { type: 'Provider Overlay Placement Opportunity', typeValue: 56 },
  { type: 'Provider Overlay Placement Opportunity End', typeValue: 57 },
  { type: 'Distributor Overlay Placement Opportunity Start', typeValue: 58 },
  { type: 'Distributor Overlay Placement Opportunity End', typeValue: 59 },
  { type: 'Unscheduled Event Start', typeValue: 64 },
  { type: 'Unscheduled Event End', typeValue: 65 },
  { type: 'Network Start', typeValue: 80 },
  { type: 'Network End', typeValue: 81 },
];

export enum CueType {
  GENERIC_CUE_TYPE_SCTE35 = 'scte35',
}

export enum SCTE35DataTypes {
  SCTE35_CUE = 'SCTE35_CUE',
  SCTE35_DATERANGE = 'SCTE35_DATERANGE',
}
