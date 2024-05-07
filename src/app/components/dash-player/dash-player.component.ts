import { Component, OnInit, Input, ViewChild, ElementRef, OnDestroy, EventEmitter, Output } from '@angular/core';
import { UrlVarsService, ViewerState, AppService, LoggerService, DrmManagerService, DrmInfoType, getDrmServerId } from '../../shared';
import { DashEvents, DashSCTEEvents } from './dash-events.constant';
import { Subject, BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { TabObjectName } from 'src/app/shared/models/tabs.model';
import { VideoPlayers } from '../../shared/models/video-players';
import { CMCDTransitionModes } from '../../shared/utils/cmcd-filter';

declare var dashjs: any;

interface RepresentationData {
  bandwidth: number;
  codecs: string;
  frameRate: number;
  height: number;
  id: string;
  mimeType: string;
  sar: string;
  scanType: string;
  width: number;
}

interface AdaptationSetData {
  Representation: RepresentationData[];
  contentType: string;
  mimeType: string;
}

interface DashData {
  data: {
    Period: {
      AdaptationSet: AdaptationSetData[];
    };
  };
  type: string;
}

interface DashRequestHeaders {
  [name: string]: string;
}
interface DashProtectionDataComponent {
  serverURL: string;
  httpRequestHeaders?: DashRequestHeaders;
  audioRobustness?: string;
  videoRobustness?: string;
  audioPssh?: string;
  videoPssh?: string;
  priority?: number;
}
interface DashProtectionData {
  [name: string]: DashProtectionDataComponent;
}
@Component({
  selector: 'app-dash-player',
  styleUrls: ['./dash-player.component.scss'],
  templateUrl: './dash-player.component.html',
})
export class DashPlayerComponent implements OnInit, OnDestroy {
  @Input() public viewerState: ViewerState;
  @Input() public width: number;

  @Output()
  public urlChange: EventEmitter<{
    url: string;
    updateBit: number;
  }> = new EventEmitter();

  @Output() public onBitrateList: EventEmitter<any> = new EventEmitter<any>();

  public player: any;
  public bitrates: any[] = [];
  public bitratesList$: BehaviorSubject<number[]> = new BehaviorSubject<number[]>([]);
  public currentBitrate = 0;
  public bufferingBitrate = 0;
  public height: number;
  public muted: boolean;
  public volume: number;
  public version: string;
  public showTopBar: boolean;
  public videoData: DashData;
  public url: string;

  public VERSION_REGEX: RegExp = /[1-9]/;

  public currentVersion: RegExpExecArray | null;

  private withCredentials = false;
  private currentTime = 0;
  private bufferInterval: NodeJS.Timer | null;
  private latencyInterval: NodeJS.Timer | null;

  private protectionData: DashProtectionData;
  private currentSource: string;

  @ViewChild('video', { static: true }) public video: ElementRef;

  private ngUnsubscribe: Subject<void> = new Subject<void>();

  constructor(
    private urlVarsService: UrlVarsService,
    public appService: AppService,
    public loggerService: LoggerService,
    private drmManager: DrmManagerService
  ) {}

  public ngOnInit() {
    this.muted = this.urlVarsService.urlVars.muted;
    this.withCredentials = this.urlVarsService.urlVars.credentials;

    (<any>window).dashjsLibrary.then(() => {
      this.drmManager.drmInfo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.getDrmInfo);
      this.viewerState.videoSource$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.loadSource);
      this.viewerState.cmcdOptions$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.setCMCD);
      this.viewerState.playerConfigChanged$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.setDynamicConfig);
      this.appService.withCredentials$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.setCredentials);
      this.appService.muteVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.switchMuted);
      this.height = this.video.nativeElement.offsetHeight;
    });
  }

  public ngOnDestroy() {
    this.destroyPlayer();
    this.ngUnsubscribe.next();
    if (this.bufferInterval) {
      clearInterval(this.bufferInterval);
      this.bufferInterval = null;
    }
    if (this.latencyInterval) {
      clearInterval(this.latencyInterval);
      this.latencyInterval = null;
    }
  }

  public setPlayerState = (state: string) => {
    this.viewerState.setPlayerState(state);
  };

  public onDurationChange = (event: Event) => {
    this.viewerState.setVideoDuration(this.video.nativeElement.duration);
  };

  public on(event: string, callback: Function) {
    console.log(event, callback);
  }

  private destroyPlayer = () => {
    if (this.player) {
      this.removeDashSubscribers();
      this.player.reset();
    }
    this.player = null;
    if (this.bufferInterval) {
      clearInterval(this.bufferInterval);
      this.bufferInterval = null;
    }
  };

  private initPlayer = (source: string) => {
    if (this.player) {
      this.destroyPlayer();
    }

    this.player = dashjs.MediaPlayer().create();

    this.player.getDebug();

    if (this.player) {
      this.player.initialize(this.video.nativeElement, source, true);
      if (this.protectionData) {
        console.log('[initPlayer] setting DRM: protectionData: ', this.protectionData);
        this.player.setProtectionData(this.protectionData);
      }
    }

    this.video.nativeElement.muted = this.muted;
    this.subscribeToCMCDEvents(); // this is to subscribe to the events to collect and send data
    this.initDashSubscribers();
    this.initSubscribers();
    this.subscribeMediaPlayerEvents();
    if (this.viewerState.cmcdOptions?.enabled) {
      this.setCMCD();
    }
    this.version = `dashjs ${dashjs.Version}`;
    this.currentVersion = this.VERSION_REGEX.exec(this.version);
    this.bufferInterval = setInterval(this.setBufferAndFrames, 500);
    this.latencyInterval = setInterval(this.setLiveStreamLatency, 500);
  };

  private subscribeToCMCDEvents() {
    this.player.on(dashjs.MetricsReporting.events.CMCD_DATA_GENERATED, this.handleCmcdDataGeneratedEvent);
  }

  private handleCmcdDataGeneratedEvent = (event: any): any => {
    let data = this.getKeysForQueryMode(event);
    return data;
  };

  private getKeysForQueryMode(event: any): any {
    let cmcdData = {};
    let cmcdString = event.cmcdString;
    this.convertCMCDStringToCMCDData(cmcdString, cmcdData);
    return cmcdData;
  }

  private convertCMCDStringToCMCDData(cmcdString: string, cmcdData: any): any {
    if (!cmcdString || cmcdString === '') {
      return;
    }

    let keyValuePairs = cmcdString.split(',');

    keyValuePairs.forEach((keyValue) => {
      let data = keyValue.split('=');
      if (data && data.length >= 2) {
        let key = data[0];
        let value = data[1];
        if (key && value) {
          cmcdData[key] = value;
        }
      }
    });
  }

  private subscribeMediaPlayerEvents() {
    [dashjs.MediaPlayer.events.ERROR, dashjs.MediaPlayer.events.LOG].forEach((e) => this.player.on(e, (ev) => this.onMediaPlayerEvent(ev)));
  }

  private onMediaPlayerEvent(e: any) {
    this.loggerService.dashLog(e.type + e.message);
  }

  private initDashSubscribers(): void {
    if (this.player) {
      this.player.on(DashEvents.MANIFEST_LOADED, this.onManifestLoaded);
      this.player.on(DashEvents.STREAM_INITIALIZED, this.onStreamInitialized);
      this.player.on(DashEvents.ERROR, this.onError);
      this.player.on(DashEvents.QUALITY_CHANGE_RENDERED, this.onQualityChangeRendered);
      this.player.on(DashEvents.QUALITY_CHANGE_REQUESTED, this.onQualityChangeRequested);

      this.player.on(DashEvents.FRAGMENT_LOADING_STARTED, this.onFragLoadStart);
      this.player.on(DashEvents.FRAGMENT_LOADING_COMPLETED, this.onFragLoadComplete);
      this.player.on(DashEvents.FRAGMENT_LOADING_ABANDONED, this.onFragLoadAbandon);

      this.player.on(DashEvents.PLAYBACK_METADATA_LOADED, this.onPlaybackMetadataLoaded);
      this.player.on(DashEvents.PLAYBACK_TIME_UPDATED, this.onTimeUpdate);

      for (const DashSCTEEvent of DashSCTEEvents) {
        this.player.on(DashSCTEEvent, this.onSCTEReceive);
      }
    }
  }

  private onSCTEReceive = (event: any): void => {
    if (this.viewerState.syncScteData) {
      const scte35Data = event.event;
      delete scte35Data.eventStream;
      const scte35Type = event.type;
      const logData = {
        data: scte35Data,
        blackout: this.scteValue('type', scte35Type),
        duration: this.scteValue('duration', scte35Data.duration),
        elapsed: this.scteValue('elapsed', scte35Data.elapsed),
        id: this.scteValue('id', scte35Data.id),
        segne: this.scteValue('segne', scte35Data.segne),
        time: this.scteValue('time', scte35Data.time),
        type: this.scteValue('type', scte35Type),
        upid: this.scteValue('upid', scte35Data.upid),
      };
      if (scte35Data.xProgramTimePosition || scte35Data.xAssetId || scte35Data.xSlotId) {
        logData['xProgramTimePosition'] = this.scteValue('xProgramTimePosition', scte35Data.xProgramTimePosition);
        logData['xAssetId'] = this.scteValue('xAssetId', scte35Data.xAssetId);
        logData['xSlotId'] = this.scteValue('xSlotId', scte35Data.xSlotId);
      }
      if (!this.viewerState.showScteDisplay) {
        this.viewerState.setOption('showScteDisplay', true);
        this.viewerState.updateActiveTab(TabObjectName.SCTEDISPLAY, true);
      }
      this.viewerState.setScteDisplayData(logData);
    }
  };

  private scteValue(name: string, value: any): any {
    return value !== undefined ? value : ``;
  }

  private removeDashSubscribers = (): void => {
    if (this.player) {
      this.player.off(DashEvents.MANIFEST_LOADED, this.onManifestLoaded);
      this.player.off(DashEvents.ERROR, this.onError);
      this.player.off(DashEvents.QUALITY_CHANGE_RENDERED, this.onQualityChangeRendered);
      this.player.off(DashEvents.QUALITY_CHANGE_REQUESTED, this.onQualityChangeRequested);

      this.player.off(DashEvents.FRAGMENT_LOADING_STARTED, this.onFragLoadStart);
      this.player.off(DashEvents.FRAGMENT_LOADING_COMPLETED, this.onFragLoadComplete);
      this.player.off(DashEvents.FRAGMENT_LOADING_ABANDONED, this.onFragLoadAbandon);

      this.player.off(DashEvents.PLAYBACK_METADATA_LOADED, this.onPlaybackMetadataLoaded);
      this.player.off(DashEvents.PLAYBACK_TIME_UPDATED, this.onTimeUpdate);
    }
  };

  private initSubscribers(): void {
    this.viewerState.seek$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.seek);
    this.viewerState.currentBandwidth$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.setQuality);
    this.appService.muteVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.switchMuted);
  }

  // Player listeners
  private onManifestLoaded = (data): void => {
    this.videoData = data;
    if (data && data.data && data.data.mediaPresentationDuration) {
      this.viewerState.setTotalDuration(data.data.mediaPresentationDuration);
      this.viewerState.onManifestLoaded(data.data);
    }
    this.url = data.data.originalUrl;
  };

  private onStreamInitialized = (): void => {
    this.viewerState.updateIsLive(this.player.isDynamic());
  };

  public updateStream = (bitrate: number): void => {
    const updateUrl = {
      url: this.url,
      updateBit: bitrate,
    };
    this.urlChange.emit(updateUrl);
  };

  private onQualityChangeRendered = (data): void => {
    if (data && data.mediaType === 'video' && typeof data.newQuality === 'number') {
      this.currentBitrate = this.bitrates[data.newQuality].bitrate;
      const bitrateEvent = {
        bitrate: this.currentBitrate,
        duration: 15,
        level: data.newQuality,
        time: this.currentTime,
      };
      this.viewerState.onBandwidthUpdated(this.currentBitrate);
    }
    this.setMetrics(this.currentBitrate);
  };

  private setMetrics(bitrate: number) {
    if (!this.videoData.data.Period || !this.videoData.data.Period.AdaptationSet) {
      return;
    }
    const dashVideoArray = this.videoData.data.Period.AdaptationSet.filter(
      (as) => as.contentType === 'video' || (as.mimeType ? as.mimeType.includes('video') : false)
    );
    const representationArray = dashVideoArray[0] ? dashVideoArray[0].Representation : [];
    for (let i = 0; i < representationArray.length; i++) {
      if (representationArray[i].bandwidth === bitrate) {
        this.viewerState.currentCodecs = representationArray[i].codecs;
        this.viewerState.currentHeight = representationArray[i].height;
        this.viewerState.currentWidth = representationArray[i].width;
      }
    }
  }

  private onQualityChangeRequested = (data): void => {
    if (
      data &&
      data.mediaType === 'video' &&
      typeof data.newQuality === 'number' &&
      this.bitrates.length &&
      this.bitrates[data.newQuality]
    ) {
      const bitrate = this.bitrates[data.newQuality].bitrate;
      this.bufferingBitrate = bitrate;
      this.viewerState.onBandwidthUpdating(bitrate);
      this.updateStream(bitrate);
    }
  };

  private onError = (data): void => {
    const currentTime = this.viewerState.currentTime || 0;
    if (!this.viewerState.videoErrors) {
      this.viewerState.videoErrors = [
        {
          time: currentTime,
          text: data.error,
          displayText: data.error + ' ' + '@' + ' ' + currentTime.toFixed(2),
        },
      ];
    } else {
      this.viewerState.videoErrors.push({
        time: currentTime,
        text: data.error,
        displayText: data.error + ' ' + '@' + ' ' + currentTime.toFixed(2),
      });
    }
    this.viewerState.onHlsError(data);
  };

  private onFragLoadStart = (data): void => {
    if (data && data.request && data.request.mediaType === 'video') {
      this.viewerState.onDashFragLoading(data.request);
    }
  };

  private onFragLoadComplete = (data): void => {
    if (data && data.request && (data.request.mediaType === 'video' || (data.request && data.request.mediaType === 'audio'))) {
      this.viewerState.onDashFragLoaded(data.request);
    }
    const streamInfo = this.player.getActiveStream().getStreamInfo();
    const periodIdx = streamInfo.index;
    const dashMetrics = this.player.getDashMetrics();
    const repSwitch = dashMetrics.getCurrentRepresentationSwitch('video', true);
    if (this.currentVersion && +this.currentVersion[0] >= 3) {
      const dashAdapter = this.player.getDashAdapter();
      const adaptation = dashAdapter.getAdaptationForType(periodIdx, 'video', streamInfo);
      const frameRate = adaptation.Representation_asArray.find(function (rep) {
        return rep.id === repSwitch.to;
      }).frameRate;
      this.viewerState.currentFrameRate = frameRate;
    }
  };

  private onFragLoadAbandon = (data): void => {
    if (data && data.request && data.request.mediaType === 'video') {
      this.viewerState.onDashFragLoadAbandon(data.request);
    }
  };

  private onPlaybackMetadataLoaded = (data): void => {
    if (this.player) {
      this.bitrates = this.player.getBitrateInfoListFor('video');
      this.bitratesList$.next(this.bitrates.map((obj) => obj.bitrate));
      this.onBitrateList.emit(this.bitratesList$);
      if (this.bitrates.length) {
        this.bufferingBitrate = this.bitrates[this.player.getQualityFor('video')].bitrate;
      }
    }
  };

  private onTimeUpdate = (data): void => {
    this.currentTime = data.time;
    this.viewerState.displayTime(this.currentTime);
  };

  public onVolumeChange = (event: Event) => {
    this.volume = this.video.nativeElement.volume;

    if (this.player && this.player.isMuted() !== this.muted) {
      this.appService.toggleMuteVideo(this.player.isMuted());
    }

    if (this.volume === 0 && !this.video.nativeElement.muted) {
      this.video.nativeElement.muted = true;
      this.appService.toggleMuteVideo(this.video.nativeElement.muted);
    }
  };

  public switchMuted = (muted: boolean) => {
    if (this.muted && this.volume === 0) {
      this.video.nativeElement.volume++;
    }
    this.muted = muted;
    this.viewerState.setMuteVideo(muted);
  };

  // Control events
  private setCredentials = (withCredentials: boolean) => {
    this.withCredentials = withCredentials;
    // this.player.setXHRWithCredentials(this.withCredentials);
  };

  private setQuality = (quality: number | string) => {
    if (this.player) {
      quality = Number(quality);
      if (this.currentVersion && +this.currentVersion[0] < 3) {
        this.player.setFastSwitchEnabled(true);
        this.player.setAutoSwitchQualityFor('video', false);
      } else {
        this.player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
        this.player.updateSettings({ streaming: { fastSwitchEnabled: true } });
      }
      if (quality < 100) {
        this.player.setQualityFor('video', quality);
      } else {
        const foundBitrate = this.bitrates.filter((eachBitrate) => {
          return eachBitrate.bitrate === Number(quality);
        })[0];
        if (foundBitrate && foundBitrate.qualityIndex > -1) {
          this.player.setQualityFor('video', foundBitrate.qualityIndex);
          this.viewerState.onBandwidthUpdated(foundBitrate.bitrate);
        }
      }
    }
  };

  public setQualityByBitrate = (obj: { bitrate: number; mouseEvent: MouseEvent }) => {
    if (obj.bitrate) {
      this.viewerState.updateBandwidth(String(obj.bitrate));
    }
    this.bitrates.some((bitrateObj) => {
      if (bitrateObj.bitrate === obj.bitrate) {
        this.setQuality(bitrateObj.qualityIndex);
        return true;
      }
      return false;
    });
  };

  public setCMCD = (): void => {
    if (!this.viewerState.cmcdOptions) {
      this.viewerState.setCMCDOptions({
        enabled: true,
        sessionId: '',
        contentId: '',
        transitionMode: CMCDTransitionModes.QUERY,
      });
    }
    if (!this.viewerState.cmcdOptions.enabled) {
      return;
    }
    if (this.player) {
      this.player.updateSettings({
        streaming: {
          cmcd: {
            enabled: this.viewerState.cmcdOptions.enabled,
            mode: this.viewerState.cmcdOptions.transitionMode,
            sid: this.viewerState.cmcdOptions.sessionId,
            cid: this.viewerState.cmcdOptions.contentId,
            enabledKeys: this.viewerState.cmcdOptions.paramsArray,
          },
        },
      });
    }
  };

  public setDynamicConfig = (): void => {
    const playerConfig = this.viewerState.playerConfigs[VideoPlayers.DASH_PLAYER];
    if (playerConfig && this.player) {
      this.player.updateSettings(JSON.parse(playerConfig));
    }
  };

  public setABR = (): void => {
    if (this.player) {
      if (this.currentVersion && +this.currentVersion[0] < 3) {
        this.player.setAutoSwitchQualityFor('video', true);
      } else {
        this.player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
      }
    }
  };

  private loadSource = (source: string) => {
    if (source) {
      this.currentSource = source;
      this.initPlayer(source);
    }
  };

  private seek = (value: number): void => {
    if (this.player) {
      this.player.seek(value);
    }
  };

  // Html
  public toggleTopBar = (show: boolean): void => {
    this.showTopBar = show;
  };

  public setBufferAndFrames = () => {
    this.viewerState.droppedFrames = (this.video.nativeElement && (this.video.nativeElement as any).webkitDroppedFrameCount) || 0;
    const bufferedTimeRanges: TimeRanges = this.video.nativeElement.buffered;
    for (let i = 0; i < bufferedTimeRanges.length; i++) {
      const startX = bufferedTimeRanges.start(i);
      const endX = bufferedTimeRanges.end(i);
      if (startX <= this.viewerState.currentTime && this.viewerState.currentTime <= endX) {
        this.viewerState.currentBuffer = Math.round(endX - this.viewerState.currentTime);
      }
    }
  };

  public setLiveStreamLatency = () => {
    const latency = this.player.getCurrentLiveLatency();
    this.viewerState.updateLatency(latency);
  };

  private createProtectionData = (info: DrmInfoType) => {
    const protData: DashProtectionData = {};
    const serverId = getDrmServerId(info.drmType);

    protData[serverId] = {
      serverURL: info.drmLicenseUrl,
    };

    if (info.headerName && info.headerValue) {
      const headerObj: DashRequestHeaders = {};
      headerObj[info.headerName] = info.headerValue;
      protData[serverId].httpRequestHeaders = headerObj;
    }

    this.protectionData = protData;
  };

  private getDrmInfo = (info: DrmInfoType) => {
    if (info.viewerStateId === this.viewerState.id || info.viewerStateId === 'global') {
      this.createProtectionData(info);
      this.loadSource(this.currentSource);
    }
  };
}
