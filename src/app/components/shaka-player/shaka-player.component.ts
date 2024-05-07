import { Component, ElementRef, Input, OnInit, ViewChild, OnDestroy, EventEmitter, Output } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import {
  AppService,
  DrmInfoType,
  DrmManagerService,
  getDrmServerId,
  LoggerService,
  Subtitles,
  UrlVarsService,
  ViewerState,
} from 'src/app/shared';
import { ShakaErrorCode } from './shakaErrorCode';
import { CMCDFilter, CMCDTransitionModes, CMCDHeaders } from '../../shared/utils/cmcd-filter';
import { VideoPlayers } from '../../shared/models/video-players';

@Component({
  selector: 'app-shaka-player',
  templateUrl: './shaka-player.component.html',
  styleUrls: ['./shaka-player.component.scss'],
})
export class ShakaPlayerComponent implements OnInit, OnDestroy {
  @Input() public viewerState: ViewerState;
  @Input() public width: number;

  @Output() public onBitrateList: EventEmitter<any> = new EventEmitter<any>();

  public currentSource: string;

  public player: shaka.Player;
  public ui;
  public bitrates: shaka.extern.TrackList = [];
  public bitratesList$: BehaviorSubject<number[]> = new BehaviorSubject<number[]>([]);
  public currentBitrate = 0;
  public bufferingBitrate = 0;
  public height: number;
  public muted: boolean;
  public volume = 1;
  public version: string;
  public showTopBar: boolean;
  public url: string;

  private drmServerInfo;
  private bufferInterval: NodeJS.Timer | null;
  private latencyInterval: NodeJS.Timer | null;

  @ViewChild('video', { static: true }) public video: ElementRef;
  @ViewChild('playerContainer', { static: true }) public playerContainer: ElementRef;

  private ngUnsubscribe: Subject<void> = new Subject<void>();
  private bufferedRange: number = 0;
  private lastLoadedFragment: number = 0;

  private startTime: number;

  constructor(
    private urlVarsService: UrlVarsService,
    public appService: AppService,
    public loggerService: LoggerService,
    private drmManager: DrmManagerService,
    private toastrService: ToastrService
  ) {}

  public ngOnInit(): void {
    (<any>window).shakajsLibrary.then(() => {
      (<any>window).shaka?.polyfill.installAll();

      if ((<any>window).shaka?.Player.isBrowserSupported()) {
        this.version = `shakajs ${shaka.Player.version}`;

        this.appService.muteVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.switchMuted);
        this.drmManager.drmInfo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.getDrmInfo);
        this.viewerState.videoSource$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.loadSource);
        this.viewerState.cmcdOptions$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.setCMCD);
        this.viewerState.playerConfigChanged$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.setDynamicConfig);
        this.viewerState.selectedSubtitles$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onSelectedSubtitles);
        this.height = this.playerContainer.nativeElement.offsetHeight;
      } else {
        // Browser not supported
        const errorMessage = 'Shaka is not supported in this Browser';
        console.error(errorMessage);
        this.toastrService.error(errorMessage);
      }
    });
  }

  public ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.destroyPlayer();
  }

  public setPlayerState = (state: string) => {
    this.viewerState.setPlayerState(state);
  };

  public onDurationChange = (event: Event) => {
    this.viewerState.setVideoDuration(this.video.nativeElement.duration);
  };

  public on(event: string, callback: Function) {
    console.log('[ShakaPlayerComponent > on]', event, callback);
  }

  private destroyPlayer = async () => {
    if (this.player) {
      if (this.bufferInterval) {
        clearInterval(this.bufferInterval);
        this.bufferInterval = null;
      }
      if (this.latencyInterval) {
        clearInterval(this.latencyInterval);
        this.bufferInterval = null;
      }
      this.removeShakaSubscribers();
      await this.player.detach();
      await this.player.destroy();
      await this.ui.destroy();
    }
  };

  public async initPlayer(source: string) {
    if (this.player) {
      await this.player.destroy();
      await this.ui.destroy();
    }

    const localPlayer = new shaka.Player(this.video.nativeElement);
    this.ui = new (<any>window).shaka.ui.Overlay(localPlayer, this.playerContainer.nativeElement, this.video.nativeElement);
    const controls = this.ui.getControls();
    this.player = controls.getPlayer();

    this.player.getNetworkingEngine()?.registerResponseFilter((type, response, context) => {
      if (type === shaka.net.NetworkingEngine.RequestType.SEGMENT) {
        const frag = response.uri.split('/').pop();
        if (frag !== undefined) {
          this.viewerState.setFragUrlChanged(frag);
        }
        if (context?.segment !== undefined) {
          this.startTime = this.startTime ?? context.segment?.getStartTime();
          const segmentDuration = Number(context.segment?.getEndTime()) - Number(context.segment?.getStartTime());
          if (segmentDuration > 0) {
            const currentSegmentNumber = Math.ceil((Number(context.segment?.getStartTime()) - this.startTime) / segmentDuration);
            this.viewerState.onShakaFragLoaded({ context, downloadTimeMs: response.timeMs, currentSegmentNumber });
          }
        }
      }
    });

    // Listen for error events.
    this.player.addEventListener('error', (event) => {
      this.onErrorEvent(event);
    });

    this.player.addEventListener('emsg', (event: any): void => {
      const eventDetail = event.detail;
      const scte35Data = {
        eventDuration: eventDetail.eventDuration / eventDetail.timescale,
        presentationTimeDelta: eventDetail.presentationTimeDelta,
        startTime: eventDetail.startTime,
        endTime: eventDetail.endTime,
        schemeId: eventDetail.schemeIdUri,
        source: event.type,
        id: eventDetail.id,
        data: eventDetail.messageData,
      };
      this.viewerState.setScteDisplayData(scte35Data);
    });

    this.player.addEventListener('timelineregionenter', (event: any): void => {
      const eventDetail = event.detail;
      const scte35Data = {
        schemeId: eventDetail.schemeIdUri,
        source: event.type,
        id: eventDetail.id,
        data: eventDetail.eventElement.innerHTML,
        duration: Math.round(eventDetail.endTime - eventDetail.startTime),
      };
      this.viewerState.setScteDisplayData(scte35Data);
    });

    this.player.addEventListener('textchanged', () => {
      const activeTextTracks = this.player.getTextTracks().filter((track) => track.active);
      let newSelectedSubtitles;
      if (activeTextTracks.length > 0) {
        const activeTrack = activeTextTracks[0];
        const activeTrackName = this.viewerState.subtitles?.find((subtitle) => subtitle.name === activeTrack.label);
        newSelectedSubtitles = { name: activeTrack.label, url: activeTrackName?.url };
        if (this.viewerState.selectedSubtitles && this.viewerState.selectedSubtitles.name === newSelectedSubtitles.name) {
          return;
        }
      } else {
        newSelectedSubtitles = {};
      }
      this.viewerState.updateSelectedSubtitles(newSelectedSubtitles as Subtitles);
    });

    this.player.addEventListener('texttrackvisibility', () => {
      const activeTextTracks = this.player.getTextTracks().filter((track) => track.active);
      if (activeTextTracks.length === 0) {
        const newSelectedSubtitle = {};
        this.viewerState.updateSelectedSubtitles(newSelectedSubtitle as Subtitles);
      }
    });

    const playerConfig = {
      preferredAudioLanguage: 'en',
      preferredTextLanguage: 'en',
    };
    if (this.drmServerInfo) {
      playerConfig['drm'] = {
        servers: this.drmServerInfo?.licenses,
      };

      if (this.drmServerInfo?.headers) {
        this.player?.getNetworkingEngine()?.registerRequestFilter((type, request) => {
          // Only add headers to license requests:
          if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
            request.headers[this.drmServerInfo?.headers.name] = this.drmServerInfo?.headers.value;
          }
        });
      }
      console.log('[initPlayer] drmServerInfo: ', this.drmServerInfo);
    }
    this.player.configure(playerConfig);
    this.setDynamicConfig();
    this.bufferInterval = setInterval(this.setBufferAndFrames, 500);
    this.latencyInterval = setInterval(this.setLiveStreamLatency, 500);
    try {
      await this.player.load(source);
      this.setCMCD();
      this.video.nativeElement.muted = this.muted;
      this.initShakaSubscribers();
      this.initSubscribers();
      this.viewerState.updateIsLive(this.player.isLive());
    } catch (e) {
      this.onError(e);
    }
  }

  public setDynamicConfig = (): void => {
    const playerConfig = this.viewerState.playerConfigs[VideoPlayers.SHAKA_PLAYER];
    if (playerConfig) {
      this.player.configure(JSON.parse(playerConfig));
    }
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
      this.player.configure('cmcd', {
        enabled: this.viewerState.cmcdOptions.enabled,
        sessionId: this.viewerState.cmcdOptions.sessionId,
        contentId: this.viewerState.cmcdOptions.contentId,
        useHeaders: this.viewerState.cmcdOptions.transitionMode === CMCDTransitionModes.HEADER,
      });
      this.player.getNetworkingEngine()?.registerRequestFilter(this.filterCMCDRequest);
    }
  };

  private filterCMCDRequest = (type: shaka.net.NetworkingEngine.RequestType, request: shaka.extern.Request) => {
    const requiredKeys = this.viewerState.cmcdOptions.paramsArray;
    if (!requiredKeys) {
      return;
    }
    if (type === shaka.net.NetworkingEngine.RequestType.MANIFEST || type === shaka.net.NetworkingEngine.RequestType.SEGMENT) {
      if (this.viewerState.cmcdOptions.transitionMode === CMCDTransitionModes.HEADER) {
        const cmcdFilter = new CMCDFilter();
        for (const CMCDHeader of CMCDHeaders) {
          request.headers[CMCDHeader] = cmcdFilter.getCMCDHeader(request.headers[CMCDHeader], requiredKeys);
          if (!request.headers[CMCDHeader]) {
            delete request.headers[CMCDHeader];
          }
        }
      } else {
        const newUris: string[] = [];
        for (const uri of request.uris) {
          const cmcdFilter = new CMCDFilter(uri);
          const keyValuesPairs = cmcdFilter.getCMCDValues();
          const filteredKeyPairs = this.getCMCDFilteredKeyPairs(requiredKeys, keyValuesPairs);
          const newUri = cmcdFilter.createNewFilteredUrl(filteredKeyPairs);
          newUris.push(newUri);
        }
        request.uris = newUris;
      }
    }
  };

  private getCMCDFilteredKeyPairs(requiredKeys: string[], keyValuesPairs: string[]): string[] {
    const filteredKeyPairs: string[] = [];
    keyValuesPairs.forEach((keyValuesPair) => {
      const key = keyValuesPair.split('=')[0];
      if (requiredKeys.includes(key)) {
        filteredKeyPairs.push(keyValuesPair);
      }
    });
    return filteredKeyPairs;
  }

  private onErrorEvent(event) {
    // Extract the shaka.util.Error object from the event.
    this.onError(event.detail);
  }

  private onError(error) {
    // Log the error.
    console.error('Error code: ', error.code, ' object: ', error);

    const message = error?.message ? error?.message : `Error: ${ShakaErrorCode[error.code + '.0']}`;
    this.toastrService.error(message, `Shaka Error Code: ${error.code}`);
  }

  private loadSource = (source: string) => {
    if (source) {
      this.currentSource = source;
      this.viewerState.setCurrentSource(this.currentSource);
      this.initPlayer(source);
    }
  };

  private seek = (value: number): void => {
    if (this.player) {
      (<any>this).player.getMediaElement().currentTime = value;
    }
  };

  public onTimeUpdate = (data): void => {
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

  // Html
  public toggleTopBar = (show: boolean): void => {
    this.showTopBar = show;
  };

  public setABR = (): void => {
    if (this.player) {
      const abr = this.player.getConfiguration().abr;
      this.player.configure('abr.enabled', !abr?.enabled);
    }
  };

  private setQuality = (quality: number | string) => {
    this.viewerState.updateBandwidth(String(quality));
    this.viewerState.onBandwidthUpdated(+quality);
    this.currentBitrate = Number(quality);
  };

  public setQualityByBitrate = (bitrate: number | string) => {
    const selectedTrack = this.bitrates?.find((e) => +e.bandwidth === +bitrate);
    if (selectedTrack) {
      if (this.player) {
        this.player.configure('abr.enabled', false);
      }
      this.updateVariantTrack(selectedTrack);
      this.setQuality(selectedTrack.bandwidth);
    }
  };

  private onSelectedSubtitles = (selectedSubtitles: Subtitles): void => {
    const textTracks = this.player.getTextTracks();
    const selectedTextTrack = textTracks?.find((e) => e.label === selectedSubtitles.name);
    if (selectedTextTrack) {
      this.player.setTextTrackVisibility(true);
      this.player.selectTextTrack(selectedTextTrack);
    } else {
      this.player.setTextTrackVisibility(false);
    }
  };
  private updateVariantTrack = (selectedTrack: shaka.extern.Track) => {
    this.player.selectVariantTrack(selectedTrack, true);
  };

  private onAdaptationChange = () => {
    const currentBitrate = this.player.getVariantTracks()?.find((e) => e.active)?.bandwidth || this.currentBitrate;
    this.setQuality(currentBitrate);
  };

  private onMainBandwithChange = (bitrate: number | string) => {
    let newBitrate = Number(bitrate);
    if (newBitrate !== this.currentBitrate) {
      this.updateTrackStats(newBitrate);
    }
  };

  private updateTrackStats = (bitrate: number): void => {
    const selectedTrack = this.bitrates?.find((e) => e.bandwidth === Number(bitrate));
    if (selectedTrack) {
      this.updateVariantTrack(selectedTrack);
      this.currentBitrate = selectedTrack.bandwidth;
      this.viewerState.currentFrameRate = `${selectedTrack?.frameRate ?? ''}`;
      this.viewerState.currentWidth = selectedTrack?.width ?? -1;
      this.viewerState.currentHeight = selectedTrack?.height ?? -1;
      this.viewerState.currentCodecs = selectedTrack?.codecs ?? '';
    }
  };

  private initShakaSubscribers(): void {
    if (this.player) {
      this.bitrates = this.player.getVariantTracks();
      const bitrateList = this.bitrates.map((obj) => obj.bandwidth);
      const uniqueBitrateList = new Set(bitrateList);
      this.bitratesList$.next([...uniqueBitrateList]);
      this.onBitrateList.emit(this.bitratesList$);

      const currentBitrate = this.bitrates?.find((e) => e.active)?.bandwidth || this.currentBitrate;
      this.setQuality(currentBitrate);
      this.updateTrackStats(this.currentBitrate);

      this.player.addEventListener('adaptation', this.onAdaptationChange);
      this.player.getMediaElement()?.addEventListener('seeked', (e) => {
        const activeVarBandwidth = this.player.getVariantTracks()?.find((e) => e.active)?.bandwidth;
        const activeVar = this.player.getManifest()?.variants?.find((e) => e.bandwidth === activeVarBandwidth);
        const newSeekedFragment = activeVar?.video?.segmentIndex?.find(this.viewerState.currentTime);
        if (newSeekedFragment) {
          this.lastLoadedFragment = newSeekedFragment;
        }
      });
    }
  }

  private removeShakaSubscribers = (): void => {
    if (this.player) {
      this.player.removeEventListener('adaptation', this.onAdaptationChange);
    }
  };

  private initSubscribers(): void {
    this.viewerState.seek$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.seek);
    this.viewerState.currentBandwidth$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onMainBandwithChange);
  }

  private createDrmData = (info: DrmInfoType) => {
    const servers = {
      licenses: {},
    };
    const serverId = getDrmServerId(info.drmType);

    servers.licenses[serverId] = info.drmLicenseUrl;

    if (info.headerName && info.headerValue) {
      servers['headers'] = {
        name: info.headerName,
        value: info.headerValue,
      };
    }

    this.drmServerInfo = servers;
  };

  private getDrmInfo = (info: DrmInfoType) => {
    if (info.viewerStateId === this.viewerState.id || info.viewerStateId === 'global') {
      this.createDrmData(info);
      this.loadSource(this.currentSource);
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
        if (this.bufferedRange < endX) {
          const activeVarBandwidth = this.player.getVariantTracks()?.find((e) => e.active)?.bandwidth;
          const activeVar = this.player.getManifest()?.variants?.find((e) => e.bandwidth === activeVarBandwidth);
          const bufferedSegmentIndex = activeVar?.video?.segmentIndex?.find(endX);
          if (bufferedSegmentIndex) {
            for (let i = this.lastLoadedFragment; i < bufferedSegmentIndex; i++) {
              const bufferedSegment = activeVar?.video?.segmentIndex?.get(i);
              const segmentUri = bufferedSegment?.getUris()[0];
              this.viewerState.shakaDashFragmentCompleted({
                start: bufferedSegment?.getStartTime(),
                end: bufferedSegment?.getEndTime(),
                uri: segmentUri,
              });
            }
            this.lastLoadedFragment = bufferedSegmentIndex;
          }
          this.bufferedRange = endX;
        }
      }
    }
  };

  public setLiveStreamLatency = () => {
    if (this.player && this.player.isLive()) {
      const liveTime = this.player?.getManifest()?.presentationTimeline?.getSegmentAvailabilityEnd();
      const currentTime = this.video.nativeElement.currentTime;
      if (liveTime && currentTime) {
        const liveLatency = liveTime - currentTime;
        this.viewerState.updateLatency(liveLatency);
      }
    }
  };
}
