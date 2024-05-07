import { ViewerState, SegmentInspector, PlayerConfigs } from '..';

export interface AddViewerOptions {
  id?: string;
  onCreate?: ViewerEventHandler;
  options: ViewerOptionTypes;
  url: string;
}

export type ViewerEventHandler = (viewer: Viewer) => void;

export interface ViewerOptionTypes {
  showVideo: boolean;
  muteVideo: boolean;
  useNative: boolean;
  showExplode?: boolean;
  showHelp: boolean;
  showMetrics: boolean;
  showCMCD: boolean;
  showPlayerConfig: boolean;
  playerConfigs?: PlayerConfigs;
  segmentInspector: SegmentInspector;
  showScteDisplay: boolean;
  showStallDetector: boolean;
  showPlayerLogs: boolean;
  showSubtitles: boolean;
  xhrCredentials: boolean;
  globalTokenActive: boolean;
  name: string;
}

export interface Viewer {
  id: string;
  readonly viewerState: ViewerState;
  url: string;
}

export interface StoredViewer {
  id: string;
  url: string;
  options: ViewerOptionTypes;
  timeStamp: number;
}

export const DefaultViewerName = 'Manifest';
