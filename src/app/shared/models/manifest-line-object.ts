import { HlsAttributes } from './hls-regex.model';
import { SCTE35Data } from './sctce35Types';

export class ManifestLineObject {
  public str: string;
  public stream: boolean;
  public media?: boolean;
  public attributes?: HlsAttributes;
  public url?: string;
  public highlight?: boolean;
  public status?: number;
  public size?: number;
  public time?: string;
  public startTime?: number;
  public bandwidth?: string;
  public fragDuration?: number;
  public loadStatus?: string;
  public loadTime?: number;
  public scteData?: SCTE35Data;
}

export interface StreamInfo {
  level?: 'master' | 'stream';
  levelUrls?: string[];
  discontinuities?: [{ time: number; text: string }];
  duration?: number;
  type?: 'live' | 'vod';
  pdt?: [{ time: number; text: string; displayText: string }];
  ads?: [{ time: number; text: string }];
  segmentUrls?: string[];
  isDVR?: boolean;
  subtitles?: { name: string; url: string }[];
}

export interface ParsedManifest {
  info: StreamInfo;
  lines: ManifestLineObject[];
  manifest: string;
  url: string;
  masterUrl?: string;
}
