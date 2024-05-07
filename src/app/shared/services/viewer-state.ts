import { EventEmitter } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import * as Hls from 'hls.js';
import { ViewerOptionTypes, Metric } from '..';
import { ParsedManifest } from '../models/manifest-line-object';
import { SCTE35Data } from '../models/sctce35Types';
import { VideoPlayers } from '../models/video-players';

export type StallDetectorStatuses = 'replay' | 'stall' | 'rollback' | 'pass';

export interface SegmentInspector {
  show: boolean;
  url?: string;
}

export interface TabsObject {
  tabTitle: string;
  toggled?: boolean;
}

export interface Subtitles {
  name: string;
  url: string;
}

export interface CMCDOptions {
  enabled: boolean;
  sessionId: string;
  contentId: string;
  transitionMode: string;
  paramsArray?: string[];
}

export interface PlayerConfigs {
  [VideoPlayers.HLS_PLAYER]: string | undefined;
  [VideoPlayers.DASH_PLAYER]: string | undefined;
  [VideoPlayers.SHAKA_PLAYER]: string | undefined;
}

export class ViewerState {
  // STATE
  public _showVideo: boolean;
  public _muteVideo: boolean;
  public _useNative: boolean;
  public _showHelp: boolean;
  public _xhrCredentials: boolean;
  public _globalTokenActive: boolean;
  public _name: string;
  public _showMetrics: boolean;
  public _showCMCD: boolean;
  public _showPlayerConfig: boolean;
  public _cmcdOptions: CMCDOptions;
  public _segmentInspector: SegmentInspector;
  public _showStallDetector: boolean;
  public _showSubtitles: boolean;
  public _showPlayerLogs: boolean;
  public _showScteDisplay: boolean;
  public _showPolling: boolean;
  public _showExplode = true;
  public _isMasterOpen: boolean;

  public url: string;
  public currentTime: number;
  public urlChange$ = new Subject<{ url: string; isMaster: boolean }>();

  public playerState: string;
  public currentBitrate: number;
  public currentLatency: number;
  public currentCodecs: string;
  public currentFrameRate: string;
  public currentHeight: number;
  public currentWidth: number;
  public currentCaption: string;
  public videoErrors: Metric[] | null = null;
  public droppedFrames: number;
  public currentBuffer: number;
  public videoDuration: number;
  public fragDuration: Metric[] | null = null;
  public stallDetectorStatus: StallDetectorStatuses;
  public subtitles: Subtitles[];
  public selectedSubtitles: Subtitles;
  public playerConfigs: PlayerConfigs = {
    [VideoPlayers.HLS_PLAYER]: undefined,
    [VideoPlayers.DASH_PLAYER]: undefined,
    [VideoPlayers.SHAKA_PLAYER]: undefined,
  };
  public levelManifests: ParsedManifest[];
  public syncScteData = false;

  public protectedStream = false;

  // EVENTS
  public videoSource$ = new BehaviorSubject<string>('');
  public seek$ = new Subject<number>();
  public currentDisplayTime$ = new Subject<number>();
  public subtitles$ = new Subject<Subtitles[]>();
  public selectedSubtitles$ = new Subject<Subtitles>();
  public currentBandwidth$ = new Subject<string>();
  public currentLatency$ = new Subject<number>();
  public currentCodecs$ = new Subject<string>();
  public currentFrameRate$ = new Subject<string>();
  public currentHeight$ = new Subject<number>();
  public currentWidth$ = new Subject<number>();
  public currentCaption$ = new Subject<string>();
  public bandwidthUpdated$ = new Subject<number>();
  public updatingBandwidth$ = new Subject<number>();
  public subsLoaded$ = new Subject<any>();
  public fragLoading$ = new Subject<Hls.FragLoadingData>();
  public fragLoaded$ = new Subject<Hls.FragLoadedData>();
  public fragLoadAbandon$ = new Subject<any>();
  public dashFragLoading$ = new Subject<any>();
  public shakaFragLoaded$ = new Subject<any>();
  public dashFragLoaded$ = new Subject<any>();
  public dashFragLoadAbandon$ = new Subject<any>();
  public hlsError$ = new Subject<Hls.ErrorData>();
  public fragChanged$ = new Subject<Hls.FragLoadedData>();
  public fragUrlChanged$ = new Subject<string>();
  public totalDuration$ = new BehaviorSubject<number>(0);
  public manifestLoaded$ = new Subject<any>();
  public currentSource$ = new Subject<string>();
  public onClose = new EventEmitter<string>();
  public setActiveTab$ = new Subject<TabsObject>();
  public shakaDashFragmentCompleted$ = new Subject<number>();
  public scteData$ = new BehaviorSubject<SCTE35Data>({ data: '' });
  public cmcdOptions$ = new Subject<CMCDOptions>();
  public playerConfigChanged$ = new Subject<string>();
  public playerSelectedChanged$ = new Subject<VideoPlayers>();
  public isLive: boolean;

  constructor(public readonly id: string, options: ViewerOptionTypes) {
    Object.keys(options).forEach((key: keyof ViewerOptionTypes) => {
      this.setOption(key, options[key]);
    });
  }

  public setOption = (option: keyof ViewerOptionTypes, value?: string | boolean | number | SegmentInspector | PlayerConfigs): void => {
    this['_' + option] = value;
  };

  public setPlayerState = (state: string): void => {
    this.playerState = state;
  };

  public updateSource(source: string): void {
    this.videoSource$.next(source);
  }

  public updateActiveTab(tabTitle: string, toggled: boolean) {
    const tabObject = { tabTitle, toggled };
    this.setActiveTab$.next(tabObject);
  }

  public setScteDisplayData(data: SCTE35Data) {
    this.scteData$.next(data);
  }

  public updateTime(time: number): void {
    this.seek$.next(time);
  }

  public updateSubtitles(subtitles: Subtitles[]): void {
    this.subtitles = subtitles;
    this.subtitles$.next(subtitles);
  }

  public updateSelectedSubtitles(subtitle: Subtitles): void {
    this.selectedSubtitles = subtitle;
    this.selectedSubtitles$.next(subtitle);
  }

  public displayTime = (time: number): void => {
    this.currentTime = time;
    this.currentDisplayTime$.next(time);
  };

  public setVideoDuration = (time: number): void => {
    this.videoDuration = time;
  };

  public setFragDuration = (time: Metric): void => {
    if (this.fragDuration) {
      this.fragDuration.push(time);
    } else {
      this.fragDuration = [time];
    }
  };

  public updateBandwidth(bandwidth: string): void {
    this.currentBandwidth$.next(bandwidth);
  }

  public updateLatency(latency: number): void {
    this.currentLatency = latency;
    this.currentLatency$.next(latency);
  }

  public onBandwidthUpdating(bandwidth: number): void {
    this.updatingBandwidth$.next(bandwidth);
  }

  public onBandwidthUpdated(bandwidth: number): void {
    this.currentBitrate = bandwidth;
    this.bandwidthUpdated$.next(bandwidth);
  }

  public updateCodecs(codecs: string): void {
    this.currentCodecs = codecs;
    this.currentCodecs$.next(codecs);
  }

  public updateFrameRate(frameRate: string): void {
    this.currentFrameRate = frameRate;
    this.currentFrameRate$.next(frameRate);
  }

  public updateHeight(height: number): void {
    this.currentHeight = height;
    this.currentHeight$.next(height);
  }

  public updateWidth(width: number): void {
    this.currentWidth = width;
    this.currentWidth$.next(width);
  }

  public updateCaption(caption: string): void {
    this.currentCaption = caption;
    this.currentCaption$.next(caption);
  }

  public onSubLoaded(data: any) {
    this.subsLoaded$.next(data);
  }

  public onFragLoading(data: Hls.FragLoadingData): void {
    this.fragLoading$.next(data);
  }

  public onFragLoaded(data: Hls.FragLoadedData): void {
    this.fragLoaded$.next(data);
  }

  public onFragLoadAbandon(data: any): void {
    this.fragLoadAbandon$.next(data);
  }

  public onDashFragLoading(data: any): void {
    this.dashFragLoading$.next(data);
  }

  public onShakaFragLoaded(data: any): void {
    this.shakaFragLoaded$.next(data);
  }

  public onDashFragLoaded(data: any): void {
    this.dashFragLoaded$.next(data);
  }

  public onDashFragLoadAbandon(data: any): void {
    this.dashFragLoadAbandon$.next(data);
  }

  public setCurrentSource(source: string): void {
    this.currentSource$.next(source);
  }

  public onFragChanged(data: Hls.FragLoadedData): void {
    this.fragChanged$.next(data);
  }

  public setFragUrlChanged(fragment: string): void {
    this.fragUrlChanged$.next(fragment);
  }

  public setMuteVideo(muted: boolean): void {
    this._muteVideo = muted;
  }

  public onHlsError(data: Hls.ErrorData): void {
    this.hlsError$.next(data);
  }

  public setTotalDuration(duration: number): void {
    this.totalDuration$.next(duration);
  }

  public onManifestLoaded(manifest): void {
    this.manifestLoaded$.next(manifest);
  }

  public updateUrl = (url: string, isMaster: boolean = false): void => {
    this.url = url;
    this.urlChange$.next({ url, isMaster });
  };

  public updatePlayerConfig = (config: string, player: VideoPlayers): void => {
    if (player) {
      this.playerConfigs[player] = config;
      this.playerConfigChanged$.next(config);
    }
  };

  public updatePlayerSelected = (player: VideoPlayers): void => {
    if (player) {
      this.playerSelectedChanged$.next(player);
    }
  };

  public shakaDashFragmentCompleted = (data: any) => {
    this.shakaDashFragmentCompleted$.next(data);
  };

  public setCMCDOptions(data: CMCDOptions) {
    this._cmcdOptions = data;
    this.cmcdOptions$.next(data);
  }

  public updateIsLive = (isLive) => {
    this.isLive = isLive;
  };

  public set isMasterOpen(isOpen: boolean) {
    this._isMasterOpen = isOpen;
  }

  // GETTERS
  public get isMasterOpen(): boolean {
    return this._isMasterOpen;
  }
  public get showVideo(): boolean {
    return this._showVideo;
  }
  public get muteVideo(): boolean {
    return this._muteVideo;
  }
  public get useNative(): boolean {
    return this._useNative;
  }
  public get showHelp(): boolean {
    return this._showHelp;
  }
  public get xhrCredentials(): boolean {
    return this._xhrCredentials;
  }
  public get globalTokenActive(): boolean {
    return this._globalTokenActive;
  }
  public get showMetrics(): boolean {
    return this._showMetrics;
  }
  public get showCMCD(): boolean {
    return this._showCMCD;
  }
  public get showPlayerConfig(): boolean {
    return this._showPlayerConfig;
  }
  public get cmcdOptions(): CMCDOptions {
    return this._cmcdOptions;
  }
  public get segmentInspector(): SegmentInspector {
    return this._segmentInspector;
  }
  public get showStallDetector(): boolean {
    return this._showStallDetector;
  }
  public get showSubtitles(): boolean {
    return this._showSubtitles;
  }
  public get showPlayerLogs(): boolean {
    return this._showPlayerLogs;
  }
  public get showScteDisplay(): boolean {
    return this._showScteDisplay;
  }
  public get name(): string {
    return this._name;
  }
  public get showPolling(): boolean {
    return this._showPolling;
  }
  public get showExplode(): boolean {
    return this._showExplode;
  }
  // Setters

  public set name(val: string) {
    this._name = val;
  }
}
