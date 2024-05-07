import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { UrlVarsService, ViewerState, AppService, Subtitles } from '../../shared';
import { takeUntil } from 'rxjs/operators';
import { Subject, BehaviorSubject } from 'rxjs';
import { LoggerService } from './../../shared/services/logger.service';
import { DrmInfoType, DrmManagerService, DRMType } from 'src/app/shared/services/drm-manager.service';
import { ToastrService } from 'ngx-toastr';
import { v4 as uuidv4 } from 'uuid';
import * as HlsTypes from 'hls.js';
import Hls from 'hls.js';
import { CMCDFilter, CMCDTransitionModes, CMCDHeaders } from '../../shared/utils/cmcd-filter';
import { customXhrLoader } from './hls-player.custom-loader';
import { VideoPlayers } from '../../shared/models/video-players';

@Component({
  selector: 'app-hls-player',
  templateUrl: './hls-player.component.html',
  styleUrls: ['./hls-player.component.scss'],
})
export class HlsPlayerComponent implements OnInit, OnDestroy {
  @Input() public useNative = false;
  @Input() public viewerState: ViewerState;
  @Input() public id: string;
  @Input() public width: number;

  @Output()
  public urlChange: EventEmitter<{
    url: string;
    updateBit: string;
    mouseEvent: MouseEvent;
  }> = new EventEmitter();
  @Output() public levels: EventEmitter<HlsTypes.Level[]> = new EventEmitter();

  @ViewChild('video', { static: true }) public video: ElementRef;
  @ViewChild('playerContainer', { static: true }) public playerContainer: ElementRef;

  public currentRendition: HlsTypes.Level;
  public availableRenditions: HlsTypes.Level[] = [];
  public bitratesList$: BehaviorSubject<number[]> = new BehaviorSubject<number[]>([]);
  public metricsUrl: string;
  public currentSource: string;
  public renditionsVisible = false;
  public menuVisible: boolean;
  public clearTime: NodeJS.Timer;
  public muted: boolean;
  public volume = 1;
  public hls: Hls;
  public version: string;
  public height: number;
  public withCredentials: boolean;
  public hlsFrameRateMap = new Map<number, number>();

  private ngUnsubscribe: Subject<void> = new Subject<void>();
  private bufferInterval: NodeJS.Timer | null;
  private latencyInterval: NodeJS.Timer | null;
  private drmInfo: DrmInfoType;
  private showHlsKeyLoadingError = true;
  private hlsConfig: any;
  constructor(
    private urlVarsService: UrlVarsService,
    private appService: AppService,
    private loggerService: LoggerService,
    private drmManager: DrmManagerService,
    private toastrService: ToastrService
  ) {}

  public ngOnInit() {
    this.initSubscribers();
    this.height = this.playerContainer.nativeElement.offsetHeight;
    this.appService.muteVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.switchMuted);
  }

  public ngOnDestroy() {
    if (this.hls) {
      this.hls.detachMedia();
      this.hls.destroy();
    }
    this.viewerState.videoErrors = null;
    if (this.bufferInterval) {
      clearInterval(this.bufferInterval);
      this.bufferInterval = null;
    }
    if (this.latencyInterval) {
      clearInterval(this.latencyInterval);
      this.latencyInterval = null;
    }

    this.ngUnsubscribe.next();
  }

  public initHls = () => {
    this.configHls();
    this.setDynamicConfig();
    this.applyHlsConfig();
  };

  public updateStream = (url: string, bitrate: string, mouseEvent: MouseEvent): void => {
    const updateUrl = {
      url: url,
      updateBit: bitrate,
      mouseEvent: mouseEvent,
    };
    this.urlChange.emit(updateUrl);
  };

  public onRenditionClick = (bitrate: string, mouseEvent: MouseEvent) => {
    if (bitrate) {
      this.viewerState.updateBandwidth(bitrate);
    }
    const levelIndex = this.availableRenditions.findIndex((rendition) => {
      return rendition.bitrate === +bitrate;
    });
    this.switchLevel(levelIndex);
    this.updateStream(this.availableRenditions[levelIndex].url[0], bitrate, mouseEvent);
  };

  public switchToAbr = () => {
    this.switchLevel(-1);
  };

  public showMenu = (menuOn: boolean) => {
    this.menuVisible = menuOn;
    if (this.menuVisible) {
      clearTimeout(this.clearTime);
    }
  };
  public showRenditions = (show: boolean) => {
    this.renditionsVisible = show;
  };

  public onTimeUpdate = (event: Event) => {
    this.viewerState.displayTime(this.video.nativeElement.currentTime);
  };

  public onVolumeChange = (event: Event) => {
    this.volume = this.video.nativeElement.volume;
    if (this.video.nativeElement && this.video.nativeElement.muted !== this.muted) {
      this.appService.toggleMuteVideo(this.video.nativeElement.muted);
    }
    if (this.volume === 0 && !this.video.nativeElement.muted) {
      this.video.nativeElement.muted = true;
      this.appService.toggleMuteVideo(this.video.nativeElement.muted);
    }
  };

  public switchMuted = (muted: boolean) => {
    if (this.muted && this.volume === 0) {
      this.video.nativeElement.volume++;
      this.volume = this.video.nativeElement.volume;
    }
    this.muted = muted;
    this.viewerState.setMuteVideo(muted);
  };

  public onDurationChange = (event: Event) => {
    this.viewerState.setVideoDuration(this.video.nativeElement.duration);
  };

  private configHls = () => {
    this.hlsConfig = {
      debug: this.loggerService,
    };
    Hls.DefaultConfig.xhrSetup = (xhr: XMLHttpRequest) => {
      if (this.viewerState.xhrCredentials) {
        xhr.withCredentials = true;
      }
    };

    for (const i in this.urlVarsService.hlsjsConfig) {
      if (Hls.DefaultConfig.hasOwnProperty(i)) {
        this.hlsConfig[i] = this.urlVarsService.hlsjsConfig[i];
      }
    }

    if (this.drmInfo?.drmLicenseUrl && (this.drmInfo?.viewerStateId === this.viewerState.id || this.drmInfo?.viewerStateId === 'global')) {
      this.hlsConfig.emeEnabled = true;
      if (this.drmInfo.drmType === DRMType.WIDEVINE) {
        this.hlsConfig.widevineLicenseUrl = this.drmInfo.drmLicenseUrl;
      }
      if (this.drmInfo?.headerName && this.drmInfo?.headerValue) {
        this.hlsConfig.licenseXhrSetup = (xhr: XMLHttpRequest, url: string) => {
          xhr.setRequestHeader(this.drmInfo.headerName || '', this.drmInfo.headerValue || '');
        };
      }
      console.log('[HlsPlayerComponent > initHls] DRM all set. ', this.drmInfo);
    }
    this.setCMCD();
    this.hlsConfig.loader = customXhrLoader;
    this.hlsConfig.xhrSetup = this.filterCMCDRequest;
  };

  private applyHlsConfig = () => {
    this.hls = new Hls(this.hlsConfig);
    this.hls.attachMedia(this.video.nativeElement);
    this.setHlsPlayerListeners();
    this.version = `hls.js ${Hls.version}`;
    this.bufferInterval = setInterval(this.setBufferAndFrames, 500);
  };

  private loadSource = (source: string) => {
    this.viewerState.protectedStream = false;
    if (source) {
      this.showHlsKeyLoadingError = true;
      this.useNative ? this.loadNativeSource(source) : this.loadHlsjsSource(source);
    }
  };

  private loadNativeSource = (source: string) => {
    this.video.nativeElement.addEventListener('encrypted', this.showDrmError, false);
    this.video.nativeElement.setAttribute('src', source);
    this.video.nativeElement.play();
  };

  private loadHlsjsSource = (source: string): void => {
    if (this.currentSource) {
      this.hls.destroy();
      this.hls.detachMedia();
    }
    this.initHls();
    this.currentSource = source;
    this.hls.loadSource(source);
    this.viewerState.updateIsLive(this.hls.levels[this.hls.currentLevel].details?.live);
  };

  private seekTime = (time: number) => {
    this.video.nativeElement.currentTime = time;
  };

  private switchLevel = (levelIndex: number): void => {
    // to avoid stall error, pausing playback until level switch is completed
    // see https://github.com/video-dev/hls.js/blob/v1.0.0-rc.5/MIGRATING.md#playback-and-level-changes
    this.video.nativeElement.pause();
    this.hls.currentLevel = levelIndex;
  };

  private switchBandwidth = (bandwidth: string): void => {
    if (bandwidth && !this.useNative) {
      const levelIndex = this.availableRenditions.findIndex((rendition) => {
        return rendition.bitrate === +bandwidth;
      });
      this.switchLevel(levelIndex);
    }
  };

  private getDrmInfo = (info: DrmInfoType) => {
    if (info.viewerStateId === this.viewerState.id || info.viewerStateId === 'global') {
      this.drmInfo = info;
      if (this.currentSource) {
        this.loadHlsjsSource(this.currentSource);
      }
    }
  };

  private initSubscribers() {
    this.viewerState.videoSource$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.loadSource);
    this.viewerState.seek$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.seekTime);
    this.viewerState.currentBandwidth$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.switchBandwidth);
    this.drmManager.drmInfo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.getDrmInfo);
    this.viewerState.selectedSubtitles$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.updateSelectedSubtitles);
    this.viewerState.cmcdOptions$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.updateCMCD);
    this.viewerState.playerConfigChanged$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.updateDynamicConfig);
  }

  private setHlsPlayerListeners() {
    this.hls.on(Hls.Events.MANIFEST_PARSED, this.onManifestParsed);
    this.hls.on(Hls.Events.LEVEL_LOADED, this.onLevelLoaded);
    this.hls.on(Hls.Events.LEVEL_SWITCHED, this.onLevelSwitched);
    this.hls.on(Hls.Events.FRAG_LOADED, this.onFragLoaded);
    this.hls.on(Hls.Events.FRAG_LOADING, this.onFragLoading);
    this.hls.on(Hls.Events.ERROR, this.onError);
    this.hls.on(Hls.Events.FRAG_CHANGED, this.onFragChanged);
    this.hls.on(Hls.Events.MEDIA_DETACHED, this.onMediaDetached);
    this.hls.on(Hls.Events.KEY_LOADING, this.showDrmError);
    this.hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, this.onSubtitleUpdate);
  }

  private showDrmError = (error) => {
    this.viewerState.protectedStream = true;

    if (error && !this.drmInfo?.drmLicenseUrl && this.showHlsKeyLoadingError) {
      const errorMessage = 'This is a protected stream, Please add enable DRM support and provide the DRM License.';
      const errorTitle = 'Loading DRM Stream without DRM License.';
      console.warn('[HlsPlayerComponent > KEY_LOADING] ' + errorTitle);
      console.error('[HlsPlayerComponent > KEY_LOADING] ' + errorMessage, error);
      this.toastrService.error(errorMessage, errorTitle);
      this.showHlsKeyLoadingError = false;
    }
  };

  private onManifestParsed = (event: string, data: HlsTypes.ManifestParsedData) => {
    this.availableRenditions = this.hls.levels;
    const isLevel = this.availableRenditions.some((level) => this.viewerState.url.includes(level.url[0]));
    const startLevel = this.availableRenditions.findIndex((level) => this.viewerState.url.includes(level.url[0]));
    this.bitratesList$.next(this.availableRenditions.map((rendition) => rendition.bitrate));
    this.levels.emit(this.availableRenditions);
    this.viewerState.setCurrentSource(this.currentSource);
    this.video.nativeElement.play();
    if (isLevel) {
      this.switchBandwidth(`${this.availableRenditions[startLevel].bitrate}`);
    }
  };

  private onLevelLoaded = (event: string, data: HlsTypes.LevelLoadedData) => {
    this.viewerState.setTotalDuration(data.details.totalduration);
  };

  private onLevelSwitched = (event: string, data: HlsTypes.LevelSwitchedData) => {
    this.availableRenditions = this.hls.levels;
    this.bitratesList$.next(this.availableRenditions.map((rendition) => rendition.bitrate));
    if ((data.level as any) >= 0) {
      this.currentRendition = this.availableRenditions[data.level as any];
      this.viewerState.currentBitrate = this.currentRendition.bitrate;
      this.viewerState.currentCodecs = this.currentRendition.videoCodec ?? '';
      this.viewerState.currentHeight = this.currentRendition.height;
      this.viewerState.currentWidth = this.currentRendition.width;
    }
  };

  private onFragLoaded = (event: string, data: HlsTypes.FragLoadedData) => {
    this.viewerState.onFragLoaded(data);
  };

  private onFragLoading = (event: string, data: HlsTypes.FragLoadingData) => {
    this.viewerState.onFragLoading(data);
  };

  private onFragChanged = (event: string, data: HlsTypes.FragLoadedData) => {
    this.viewerState.displayTime(this.video.nativeElement.currentTime);
    this.viewerState.onFragChanged(data);
    data.frag.sn = data.frag.sn === 'initSegment' ? 0 : data.frag.sn;
    if (this.hlsFrameRateMap.get(data.frag.sn) !== undefined) {
      this.viewerState.currentFrameRate = this.hlsFrameRateMap.get(data.frag.sn)!.toString();
    }
    if (data.frag.relurl) {
      this.viewerState.setFragUrlChanged(data.frag.relurl);
    }
  };

  private onMediaDetached = () => {
    // clean up Hls.js and MediaKeys.
    this.video.nativeElement.setAttribute('src', '');
    this.video.nativeElement
      .setMediaKeys(null)
      .then((_) => {
        console.log('reset mediakeys');
      })
      .catch((err) => {
        console.log('error with reseting mediakeys. ', err);
      });
  };

  private onSubtitleUpdate = (event, subtitle): void => {
    let newSelectedSubtitles;
    if (subtitle.id >= 0) {
      newSelectedSubtitles = { name: subtitle.name, url: subtitle.url };
      if (this.viewerState.selectedSubtitles && this.viewerState.selectedSubtitles.name === newSelectedSubtitles.name) {
        return;
      }
    } else {
      newSelectedSubtitles = {};
    }
    this.viewerState.updateSelectedSubtitles(newSelectedSubtitles);
  };

  private updateSelectedSubtitles = (subtitle): void => {
    this.hls.subtitleTrack = this.hls.subtitleTracks.find((e) => e.name === subtitle.name)?.id ?? -1;
  };

  public setPlayerState = (state: string): void => {
    this.viewerState.setPlayerState(state);
  };

  private onError = (event: string, data: HlsTypes.ErrorData) => {
    const errorCurrentTime = this.viewerState.currentTime || 0;
    if (!this.viewerState.videoErrors) {
      this.viewerState.videoErrors = [
        {
          time: errorCurrentTime,
          text: (data.details || '').toString(),
          displayText: (data.details || '').toString() + '@' + ' ' + errorCurrentTime.toFixed(2),
        },
      ];
    } else {
      this.viewerState.videoErrors.push({
        time: errorCurrentTime,
        text: (data.details || '').toString(),
        displayText: (data.details || '').toString() + '@' + ' ' + errorCurrentTime.toFixed(2),
      });
    }
    this.viewerState.onHlsError(data);
    if (data.type === 'keySystemError') {
      this.toastrService.error(data.details, 'HLS ERROR ' + data.type);
    }
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

  private setCMCD = () => {
    if (!this.viewerState.cmcdOptions) {
      this.viewerState.setCMCDOptions({
        enabled: true,
        sessionId: '',
        contentId: '',
        transitionMode: CMCDTransitionModes.QUERY,
      });
    }
    this.hlsConfig.cmcd = {
      enabled: this.viewerState.cmcdOptions.enabled,
      sessionId: this.viewerState.cmcdOptions.sessionId,
      contentId: this.viewerState.cmcdOptions.contentId,
      useHeaders: this.viewerState.cmcdOptions.transitionMode === CMCDTransitionModes.HEADER,
    };
  };

  private updateCMCD = () => {
    if (
      this.viewerState.cmcdOptions.enabled !== this.hlsConfig.cmcd.enabled ||
      this.viewerState.cmcdOptions.sessionId !== this.hlsConfig.cmcd.sessionId ||
      this.viewerState.cmcdOptions.contentId !== this.hlsConfig.cmcd.contentId ||
      (this.viewerState.cmcdOptions.transitionMode === CMCDTransitionModes.HEADER) !== this.hlsConfig.cmcd.useHeaders
    ) {
      if (this.hls) {
        this.hls.detachMedia();
        this.hls.destroy();
      }
      this.setCMCD();
      this.applyHlsConfig();
      this.hls.loadSource(this.currentSource);
    }
  };

  private updateDynamicConfig = (): void => {
    if (this.hls) {
      this.hls.detachMedia();
      this.hls.destroy();
    }
    this.setDynamicConfig();
    this.applyHlsConfig();
    this.hls.loadSource(this.currentSource);
  };

  private setDynamicConfig = (): void => {
    const playerConfig = this.viewerState.playerConfigs[VideoPlayers.HLS_PLAYER];
    if (playerConfig) {
      const parsedPlayerConfig = JSON.parse(playerConfig);
      for (const property in parsedPlayerConfig) {
        if (Hls.DefaultConfig.hasOwnProperty(property)) {
          this.hlsConfig[property] = parsedPlayerConfig[property];
        }
      }
    }
  };

  private filterCMCDRequest = (xhr: XMLHttpRequest, url: string, headers: any) => {
    const cmcdFilter = new CMCDFilter(url);
    if (this.viewerState.cmcdOptions?.enabled) {
      const requiredKeys = this.viewerState.cmcdOptions?.paramsArray;
      if (!requiredKeys) {
        return;
      }
      if (this.viewerState.cmcdOptions.transitionMode === CMCDTransitionModes.HEADER) {
        for (const CMCDHeader of CMCDHeaders) {
          if (headers[CMCDHeader]) {
            const headerValue = cmcdFilter.getCMCDHeader(headers[CMCDHeader], requiredKeys);
            headers[CMCDHeader] = headerValue;
            xhr.setRequestHeader(CMCDHeader, headerValue);
          }
        }
        const params = cmcdFilter.removeCMCDParam();
        const stringParams = params.toString();
        url = stringParams ? url.split('?')[0] + '?' + stringParams : url.split('?')[0];

        xhr.open('GET', url, true);
      } else {
        let cmcdValues = cmcdFilter.getCMCDValues();
        const filteredCMCDValues = cmcdFilter.getCMCDFilteredKeyPairs(requiredKeys, cmcdValues);
        const newUrl = cmcdFilter.createNewFilteredUrl(filteredCMCDValues);
        xhr.open('GET', newUrl, true);
      }
    } else {
      const params = cmcdFilter.removeCMCDParam();
      const stringParams = params.toString();
      url = stringParams ? url.split('?')[0] + '?' + stringParams : url.split('?')[0];
      xhr.open('GET', url, true);
    }
  };

  public setLiveStreamLatency = () => {
    if (this.hls.levels[this.hls.currentLevel].details?.live) {
      const liveLatency = this.hls.latency;
      if (liveLatency) {
        this.viewerState.updateLatency(liveLatency);
      }
    }
  };
}
