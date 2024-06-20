import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import {
  DataService,
  ParserService,
  KeyboardService,
  ManifestLineObject,
  ManifestResponse,
  AppService,
  ViewerState,
  TabObject,
  DashSegment,
  ViewerOptionTypes,
  VarNames,
  StorageService,
  DefaultViewerName,
  StoredViewer,
  ParsedManifest,
  UserAgentUtil,
  Metric,
  ScrollTypes,
  GoogleAnalyticsEventsService,
  AddViewerOptions,
  SegmentInspector,
  Viewer,
  AppServiceScroll,
  VideoPlayers,
  VideoSourceType,
  getVideoPlayerType,
} from '../../shared';
import { BehaviorSubject, Subject, interval } from 'rxjs';
import { takeUntil, sample } from 'rxjs/operators';

import { DURATION_REGEX } from '../../shared/models/hls-regex.model';
import { DownloadDataManager, DownloadData } from '../../shared/services/download-data-manager.service';
import { safeURL } from '../../shared/utils/safe-url.util';
import * as HlsTypes from 'hls.js';
import Hls from 'hls.js';
import { request } from 'http';

interface HlsProgressivePerformanceTiming {
  start: number;
  first?: number;
  end: number;
}
interface HlsStats {
  aborted: false;
  buffering: HlsProgressivePerformanceTiming;
  bwEstimate: number;
  chunkCount: number;
  loaded: number;
  loading: HlsProgressivePerformanceTiming;
  parsing: HlsProgressivePerformanceTiming;
  retry: number;
  total: number;
  trequest: number;
  tload: number;
}
interface HlsCustomFragment extends HlsTypes.Fragment {
  baseurl: string;
}
interface HlsFragLoadedData extends HlsTypes.FragLoadedData {
  stats: HlsStats;
  frag: HlsCustomFragment;
}
@Component({
  selector: 'app-manifest-viewer',
  templateUrl: 'manifest-viewer.component.html',
  styleUrls: ['manifest-viewer.component.scss'],
})
export class ManifestViewerComponent implements OnInit, OnDestroy {
  @Input() public id: string;
  @Input() public isOnlyViewer = true;
  @Input() public externalUrl: string;
  @Input() public viewerState: ViewerState;
  @Input() public widthInPx: number;
  @Input() public viewer: Viewer;
  @Input() public viewers: Viewer[];
  @Input() public bitratesList: number[];
  @Output() public newViewerRequest = new EventEmitter<AddViewerOptions>();
  @Output() public closeViewer = new EventEmitter<string>();
  @ViewChild('search', { static: true }) private searchInput: ElementRef;
  @ViewChild('manifestUrlInput', { static: true }) private manifestUrlInput: ElementRef;
  @ViewChild('editableViewerName', { static: false }) private editableViewerName: ElementRef;

  public currentUrl: string;
  public params: string;
  public setManifestUrl: string;
  public manifestUrlIsMaster: boolean;
  public resChange: boolean;
  public alevelActive: boolean;
  public tabs: TabObject[][];
  public bandwidths: number[][];
  public changeBit: string;
  public changeBitB: string;
  public resErrorChange: boolean;
  public manifest: ManifestLineObject[] = [];
  public manifest$ = new BehaviorSubject<ManifestLineObject[]>([]);
  public manifestUpdate$ = new BehaviorSubject<ParsedManifest | null>(null);
  public viewerReset$ = new Subject<void>();
  public viewPortItems: ManifestLineObject[];
  public searchMatches: ManifestLineObject[] | DashSegment[];
  public currentSearchMatch: ManifestLineObject | DashSegment | null;
  public masterClickStatus: number | undefined;
  public masterClickText: string | undefined;
  public toggleValue = false;
  public openedVariantsIds: string[] = [];

  // VTT
  public subtitles: ManifestLineObject[] = [];
  public subtitles$ = new BehaviorSubject<ManifestLineObject[]>([]);

  // DASH
  public segments: DashSegment[] = [];
  public segments$ = new BehaviorSubject<DashSegment[]>([]);
  public representation: number[];
  public dashBitrates: number[];

  public activeSearchTerm: string;
  public invalidRegEx: boolean;
  public res: ManifestResponse = { url: '' };
  public inErrorState = false;
  public pollIntervalTime: number;
  public percentLoaded = 0;
  public showFrame = false;
  public canSelectStream = false;
  public showPoll: boolean;
  public currentBandwidth: number;
  public hlsIsSupported: boolean;
  public searchOpen: boolean;
  public ctrlKeyActive: boolean;
  public hideManifestTopInputs = false;
  public scrollInto$: Subject<DashSegment | ManifestLineObject> = new Subject();
  public muted: boolean;
  public pollingActive: boolean;
  public activeKey: boolean;
  public scrolling: ScrollTypes = ScrollTypes.AUTO_SCROLL;

  public type: VideoSourceType = 'unknown';
  public showInputDropdown = false;
  public showOptionsMenu = false;
  public activeTab: TabObject;
  public activeRedundancy = -1;
  public activeBandwidth = -1;
  public useNative = false;
  public possibleNative: boolean;
  public masterManifest: ManifestLineObject[];
  public cachedMasterManifest: ParsedManifest;
  public masterVttManifest: {
    masterManifest: ManifestLineObject[];
    url: string;
  };

  public VideoPlayers = VideoPlayers;
  public selectedPlayer = VideoPlayers.NONE;
  public manifestView = 'manifest';

  public alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  private pollInterval: NodeJS.Timer | null;
  private streamManifestContainer: HTMLElement;
  private currentTerm: string;
  private scrollOffsetLines = 5;
  private currentGlobalToken: string;
  private isDvrStream?: boolean;
  private currentFragment: string;
  private currentSource: string;

  private ngUnsubscribe: Subject<void> = new Subject<void>();

  constructor(
    private dataService: DataService,
    private parserService: ParserService,
    private appService: AppService,
    private downloadManager: DownloadDataManager,
    public storageService: StorageService,
    public keyboardService: KeyboardService,
    public ga: GoogleAnalyticsEventsService
  ) {}

  public ngOnInit() {
    (<any>window).hlsjsLibrary.then(() => {
      this.hlsIsSupported = Hls.isSupported();
    });
    this.subscribeToCommands();
    const selectedPlayer = this.storageService.getSelectedPlayer();
    if (selectedPlayer) {
      this.selectedPlayer = selectedPlayer;
    }
    if (UserAgentUtil.is.edge || UserAgentUtil.is.ie) {
      setTimeout(() => {
        this.viewerState.name = this.viewerState.name + ' ';
        this.currentUrl = (this.currentUrl || '') + ' ';
        this.params = (this.params || '') + ' ';
        setTimeout(() => {
          this.viewerState.name = this.viewerState.name.slice(0, -1);
          this.currentUrl = this.currentUrl.slice(0, -1);
          this.params = this.params.slice(0, -1);
        }, 0);
      }, 0);
    }
    this.subscribeToEvents();
    if (this.externalUrl) {
      this.viewerState.updateUrl(this.externalUrl);
    } else if (!this.isOnlyViewer) {
      this.focusInput();
    }

    if (UserAgentUtil.is.safari || UserAgentUtil.is.edge) {
      this.possibleNative = true;
      this.useNative = true;
    } else if (!UserAgentUtil.is.safari && !UserAgentUtil.is.edge) {
      this.useNative = false;
    }

    this.closeViewer.subscribe(this.closeVariantsHandler);
    this.loadMenuState();
  }

  public subscribeToCommands = () => {
    this.appService.showUrl$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.toggleTempUrl);
    this.appService.showVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.toggleVideo);
    this.appService.showSubtitles$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.toggleSubtitles);
    this.appService.muteVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.toggleMute);
    this.appService.showHelp$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.toggleHelp);
    this.appService.toggleScrolling$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.setScrolling);
    this.appService.withCredentials$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.withCredentialsChange);
    this.appService.displayMetrics$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.toggleMetrics);
    this.appService.useCustomPlayerConfig$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.togglePlayerConfig);
    this.appService.displayCMCD$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.toggleCMCD);
    this.appService.displaySegmentInspector$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.toggleSegmentInspector);
    this.appService.displayStallDetector$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.toggleStallDetector);
    this.appService.displayPlayerLogs$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.togglePlayerLogs);
    this.appService.pollInterval$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onIntervalChange);
    this.appService.showPolling$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.setPollingActive);
    this.appService.openSetManifest$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.openUrlFromAppService);
    this.appService.updatePlayerConfig$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.updatePlayerConfig);
    this.appService.muteVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.switchMuted);
    this.appService.globalTokenChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onGlobalTokenChange);
    this.appService.useGlobalToken$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onUseGlobalTokenChange);
    this.appService.nameChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onNameChange);
    this.appService.useNative$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.toggleHls);
    this.appService.showPolling$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onMasterClick);
  };

  public subscribeToEvents(): void {
    this.viewerState.urlChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.updateUrl);
    this.viewerState.fragLoaded$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((data) => this.mapFragStatus(data, 'fragLoaded'));
    this.viewerState.fragLoading$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((data) => this.mapFragStatus(data, 'fragLoading'));
    this.viewerState.fragChanged$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((data) => this.mapFragStatus(data, 'fragLoaded'));
    this.viewerState.hlsError$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.hlsError);
    this.viewerState.currentBandwidth$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.handleBandwidthChange);
    this.viewerState.currentDisplayTime$.pipe(takeUntil(this.ngUnsubscribe), sample(interval(1000))).subscribe(this.onTimeUpdate);
    this.viewerState.manifestLoaded$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onManifestLoaded);
    this.viewerState.subsLoaded$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onSubtitlesLoaded);
    this.viewerState.dashFragLoading$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onDashFragLoading);
    this.viewerState.dashFragLoaded$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onDashFragLoaded);
    this.viewerState.dashFragLoadAbandon$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onDashFragLoadAbandon);
    this.viewerState.bandwidthUpdated$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onBandwidthUpdate);
    this.viewerState.currentSource$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((data) => (this.currentSource = data));
    this.viewerState.shakaDashFragmentCompleted$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((data) => this.shakaDashFragmentCompleted(data));
    this.viewerState.fragUrlChanged$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((fragment) => {
      this.currentFragment = fragment;
      if (this.isDvrStream) {
        this.setHighlightedDVRLine();
      }
    });
    this.viewerState.shakaFragLoaded$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onShakaFragLoaded);
  }

  public ngOnDestroy() {
    this.ngUnsubscribe.next();
  }

  public closeSession() {
    this.closeViewer.emit(this.id);
    this.viewerState.onClose.emit(this.id);
    this.downloadManager.setDownloadData({
      data: { series: { downloadTime: -1 }, label: -1 },
      asset: this.currentSource,
      currentUrl: this.viewer.url,
      viewerStateId: this.viewerState.id,
    });
  }

  public onNameChange = (val: { id: string; name: string }) => {
    if (val.id === this.id || (this.isOnlyViewer && !val.id)) {
      this.setViewerName(val.name);
    }
  };

  public openUrlFromAppService = (val: string) => {
    this.currentUrl = val;
    this.viewerState.updateUrl(val, true);
  };

  public generatePermalinkUrl = (useHttp = false): string => {
    let url = (useHttp ? 'http:' : window.location.protocol) + '//' + window.location.host + '/';
    if (this.viewerState.showVideo) {
      url += this.appendVar(url, VarNames.SHOWVIDEO, this.viewerState.showVideo);
    }
    if (this.viewerState.muteVideo) {
      url += this.appendVar(url, VarNames.SHOWVIDEO, this.viewerState.muteVideo);
    }
    if (this.viewerState.showHelp) {
      url += this.appendVar(url, VarNames.SHOWHELP, this.viewerState.showHelp);
    }
    if (!this.muted) {
      url += this.appendVar(url, VarNames.MUTED, this.muted);
    }
    if (this.viewerState.xhrCredentials) {
      url += this.appendVar(url, VarNames.XHRCREDENTIALS, this.viewerState.xhrCredentials);
    }
    if (this.viewerState.globalTokenActive) {
      url += this.appendVar(url, VarNames.USEGLOBALTOKEN, this.viewerState.globalTokenActive);
    }
    if (this.viewerState.showMetrics) {
      url += this.appendVar(url, VarNames.SHOWMETRICS, this.viewerState.showMetrics);
    }
    if (this.currentUrl) {
      url += this.appendVar(url, VarNames.URL, encodeURIComponent(this.currentUrl));
    }
    if (this.params) {
      return url + this.params;
    }
    return url;
  };

  public toggleHls = (val: boolean): void => {
    if (this.viewerState.showVideo) {
      this.toggleVideo(false);
      this.setOption('useNative', val);
      setTimeout(() => {
        this.toggleVideo(true);
      }, 300);
    }
    this.useNative = val;
    this.setOption('useNative', val);
  };

  private appendVar = (url: string, prop: string, value: boolean | string | number): string => {
    const newUrl = (url.indexOf('?') > -1 ? '&' : '?') + prop + '=' + (typeof value === 'boolean' ? +value : value);
    return newUrl;
  };

  public updateBandwidth = (bandwidth: number) => {
    this.viewerState.updateBandwidth(String(bandwidth));
  };

  public updatePlayerConfig = (config: string) => {
    this.viewerState.updatePlayerConfig(String(config), this.storageService.getSelectedPlayer());
  };

  public onDropdownClick = (
    obj: {
      bitrate: number;
      mouseEvent: MouseEvent;
    },
    redundancy: number
  ) => {
    const { mouseEvent, bitrate } = obj;
    const matchingTab: TabObject | undefined =
      this.tabs[redundancy] && this.tabs[redundancy].find((tab) => Number(tab.bandwidth) === bitrate);
    if (matchingTab && matchingTab.url) {
      if (this.type === 'dash') {
        const baseUrl = this.parserService.urlPath.origin + this.parserService.urlPath.pathname;
        if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
          this.openNewViewer(baseUrl);
        } else {
          this.updateStreamUrl({ url: baseUrl, bandwidth: matchingTab.bandwidth });
        }
      } else {
        if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
          this.openNewViewer(matchingTab.url);
        } else {
          this.updateStreamUrl({ url: matchingTab.url, bandwidth: matchingTab.bandwidth });
        }
      }
    }
  };

  public updateStreamUrl(level: { url: string; bandwidth?: string }): void {
    this.clearManifest();
    this.setOption('showExplode', false);
    if (level.bandwidth && level.url) {
      this.viewerState.updateBandwidth(level.bandwidth);
    }
    this.activeKey = false;
    this.viewerState.updateUrl(level.url);
  }

  private isNotSameAsset(url: string) {
    let assets = 1;
    const urlBase = this.parserService.getBaseUrl(url);
    if (this.viewers.length > 1) {
      this.viewers.map(() => {
        if (this.viewer.url !== '') {
          if (urlBase === this.parserService.getBaseUrl(this.viewer.url)) {
            assets++;
          }
        }
      });
    }
    return assets === 1;
  }

  /**
   * Before setting selectedPlayer, check if the player can display the stream
   */
  private setSelectedPlayer = (type: VideoSourceType) => {
    // shaka can play both types of stream
    const check = type !== this.selectedPlayer && this.selectedPlayer !== VideoPlayers.SHAKA_PLAYER;
    if (this.selectedPlayer === VideoPlayers.NONE || check) {
      this.selectedPlayer = getVideoPlayerType(type);
    }
  };

  public updateUrl = async (data: { url: string; isMaster: boolean }) => {
    const { url: url_, isMaster } = data;
    let url = url_;
    if (url) {
      if (url.endsWith('/')) {
        url = url.replace(/\/$/, '');
      }
      this.inErrorState = false;
      if (this.tabs && this.tabs[0]) {
        this.setActiveTab(url);
      }
      this.res.statusText = '⌛';
      this.res.status = undefined;
      const previousType = this.type;
      if (this.type === 'dash') {
        this.toggleVideo(true);
        this.toggleStallDetector(false);
      }

      const urlParams = this.parserService.getUrlParams(url) || '';
      const removedQuery = /^\?+(.*)/.exec(this.params) || [];
      const existingParams = removedQuery[1] || this.params || '';
      if (!this.viewerState.globalTokenActive) {
        this.params = this.combineParams(urlParams.split('&').concat(existingParams.split('&')));
      }
      this.currentUrl = this.parserService.getBaseUrl(url);

      let reqOptions;
      if (this.viewerState.xhrCredentials) {
        reqOptions = {
          credentials: 'include',
        };
      }
      if (this.isNotSameAsset(url)) {
        this.viewerState.isMasterOpen = true;
        this.downloadManager.cleanData(this.viewerState.id);
      }

      if (this.cachedMasterManifest && isMaster) {
        this.onManifestParseSuccess(this.cachedMasterManifest);
        this.updateSearchTerm('');
        return;
      }
      try {
        const response = await this.dataService.getManifest(this.currentUrl + this.params, reqOptions);
        this.type = this.parserService.getManifestType(response.text!);
        this.setSelectedPlayer(this.type);
        this.onGetManifestSuccess(response);
        try {
          const parsedManifest = await this.parserService.parseManifest(response);
          if ((!this.pollInterval && !(this.tabs && this.tabs.length)) || this.type !== previousType || this.activeKey) {
            this.currentUrl = this.currentUrl + this.params;
            this.viewerState.updateSource(this.currentUrl);
            this.activeKey = false;
            if (parsedManifest?.info.subtitles) {
              this.viewerState.updateSubtitles(parsedManifest?.info.subtitles);
            } else {
              this.viewerState.updateSubtitles([]);
              this.toggleSubtitles(false);
            }
          }
          this.onManifestParseSuccess(parsedManifest);
          if (isMaster) {
            this.cachedMasterManifest = parsedManifest;
          }
          this.updateSearchTerm('');
        } catch (err) {
          this.onManifestParseFailure(err);
        }
      } catch (err) {
        this.onGetManifestError(err);
      }
    } else {
      this.resetViewer();
    }
  };

  public onLoadClicked = () => {
    if (!this.keyboardService.cntrlActive) {
      this.loadCurrentSetUrl(true);
    } else {
      if (this.params) {
        this.openNewViewer(this.currentUrl + this.params);
      } else {
        this.openNewViewer(this.currentUrl);
      }
    }
  };

  public getBitrateList(data: BehaviorSubject<number[]>) {
    this.dashBitrates = data.value;
  }

  public loadCurrentSetUrl(isMaster: boolean = false) {
    this.clearManifest();
    this.inErrorState = false;
    if (this.type === 'vtt') {
      this.manifest = this.masterVttManifest.masterManifest;
      this.viewerState.updateUrl(this.masterVttManifest.url, isMaster);
      this.currentUrl = this.masterVttManifest.url;
    } else {
      this.manifest = this.masterManifest;
      this.viewerState.updateUrl(this.setManifestUrl, isMaster);
      this.currentUrl = this.setManifestUrl;
    }
  }

  public onMasterClick() {
    if (!this.keyboardService?.cntrlActive) {
      if (!this.viewerState) {
        return;
      }
      this.pollingActive = false;
      this.viewerState._showPolling = false;
      this.stopPoll();
      this.loadCurrentSetUrl();
      this.viewerState.segmentInspector.show = false;
      this.setOption('showExplode', true);
    } else {
      if (this.type === 'vtt') {
        this.openNewViewer(this.masterVttManifest.url);
      } else {
        this.openNewViewer(this.setManifestUrl);
      }
    }
  }

  public onPlayerBandwidthSelect = (url: string, bandwidth: string) => {
    if (this.keyboardService.cntrlActive) {
      this.openNewViewer(url);
    } else {
      this.updateStreamUrl({ url, bandwidth });
    }
  };

  public loadBlankViewer() {
    this.ga.emitEvent('Click', 'Open New Viewer', 'MOE: Viewer Page');
    this.newViewerRequest.emit({
      url: '',
      options: {
        name: DefaultViewerName,
        showVideo: false,
        muteVideo: false,
        useNative: false,
        showHelp: false,
        xhrCredentials: false,
        globalTokenActive: false,
        showMetrics: false,
        showCMCD: false,
        showPlayerConfig: false,
        segmentInspector: { show: false },
        showScteDisplay: false,
        showStallDetector: false,
        showPlayerLogs: false,
        showSubtitles: false,
      },
    });
  }

  public combineParams(params: string[]): string {
    const allParams: string[] = [];
    params.forEach((eachParam) => {
      if (eachParam && allParams.indexOf(eachParam) < 0) {
        allParams.push(eachParam);
      }
    });
    const baseParams = allParams.join('&');
    return baseParams ? '?' + baseParams : '';
  }

  public setScrolling = (value: AppServiceScroll) => {
    if (value.viewerStateId === this.viewerState.id) {
      this.scrolling = value.currentScoll;

      if (this.scrolling === ScrollTypes.TAIL_MANIFEST) {
        if (this.manifest && this.type === 'hls') {
          this.scrollInto$.next(this.manifest[this.manifest.length - 1]);
        } else if (this.segments && this.type === 'dash') {
          this.scrollInto$.next(this.segments[this.segments.length - 1]);
        }
      }
    }
  };

  public setPollingActive = (val: boolean) => {
    this.pollingActive = val;
    if (this.parserService?.streamInfo?.level === 'stream') {
      if (this.pollingActive) {
        this.beginPoll();
      } else {
        this.stopPoll();
      }
    }
  };

  public copyStreamViewer(isOn: boolean): void {
    this.canSelectStream = isOn;
  }

  public onIntervalChange = (val: number) => {
    this.pollIntervalTime = val;
    if (this.pollingActive) {
      this.beginPoll();
    }
  };

  private onManifestLoaded = (manifest: any) => {
    this.segments = [];
    this.segments$.next(this.segments);
    const representationObj = (manifest.Period.AdaptationSet[1] || manifest.Period.AdaptationSet).Representation;
    this.representation = representationObj.length ? representationObj.map((obj) => obj.bandwidth) : [representationObj];
    this.bandwidths = [this.representation];
  };

  private shakaDashFragmentCompleted = (data: any) => {
    const startTime = data.start;
    const endTime = data.end;
    const diff = endTime - startTime;
    if (diff > 0) {
      const segment = {
        url: data.uri,
        startTime: startTime,
        duration: Math.round(diff),
        loadStatus: 'loaded',
      };
      this.onDashFragLoading(segment);
      this.onDashFragLoaded(segment);
    }
  };

  private beginPoll(): void {
    this.stopPoll();
    if (!isNaN(this.pollIntervalTime) && this.currentUrl && this.pollIntervalTime > 0) {
      this.pollInterval = setInterval(() => {
        let reqOptions;
        if (this.viewerState.xhrCredentials) {
          reqOptions = {
            credentials: 'include',
          };
        }
        this.dataService
          .getManifest(this.currentUrl + this.params, reqOptions)
          .then(this.onGetManifestSuccess)
          .catch(this.onGetManifestError)
          .then(this.parserService.parseManifest)
          .catch(this.onManifestParseFailure)
          .then(this.onManifestParseSuccess);
      }, this.pollIntervalTime * 1000);
    }
  }

  private stopPoll(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private flashResponse(): void {
    this.resChange = true;
    setTimeout(() => {
      this.resChange = false;
    }, 1000);
  }

  private flashErrorResponse(): void {
    this.resErrorChange = true;
    setTimeout(() => {
      this.resErrorChange = false;
    }, 1000);
  }

  private onGetManifestSuccess = (res: ManifestResponse): ManifestResponse => {
    this.res = res;
    this.flashResponse();
    this.inErrorState = false;
    this.masterClickStatus = res.status;
    this.masterClickText = res.statusText;
    return res;
  };

  private onGetManifestError = (err: ManifestResponse): void => {
    this.res = err;
    this.flashErrorResponse();
    this.stopPoll();
    this.inErrorState = true;
    this.manifest = [];
    this.manifest$.next([]);
    throw new Error('Error getting manifest');
  };

  private onManifestParseFailure = (error: Error) => {
    if (error.message !== 'Error getting manifest') {
      // from onGetManifestError
      this.stopPoll();
      this.inErrorState = true;
      this.res.text = error.message;
      this.manifest = [];
      this.manifest$.next([]);
    }
    // re throw the error to prevent anymore .thens
    throw new Error(error.message);
  };

  private manageAutomaticPolling = (): void => {
    const streamInfo = this.parserService?.streamInfo;
    const isHlsLiveStream = this.type === 'hls' && streamInfo?.type === 'live' && streamInfo?.level === 'stream';
    const isDashLive = this.type === 'dash' && streamInfo?.type === 'live';
    if (isHlsLiveStream || isDashLive) {
      this.viewerState._showPolling = true;
      this.pollingActive = true;
    }
    if (this.pollingActive && !this.pollInterval) {
      this.beginPoll();
    }
  };

  private onManifestParseSuccess = (manifest: ParsedManifest): void => {
    this.manageAutomaticPolling();
    if (manifest.info.level === 'stream') {
      const tempManifest = this.manifest;
      this.manifest = manifest.lines;
      if (!this.masterManifest) {
        this.setManifestUrl = this.currentUrl;
        this.manifestUrlIsMaster = false;
      } else if (this.manifestUrlIsMaster) {
        manifest.masterUrl = this.setManifestUrl;
      }
      if (this.manifest[this.manifest.length - 1].str.indexOf('EXT-X-ENDLIST') < 0) {
        for (const i in tempManifest) {
          if (tempManifest[i].loadStatus) {
            this.manifest[i].loadStatus = tempManifest[i].loadStatus;
            this.manifest[i].size = tempManifest[i].size;
          }
        }
      }
      this.manifest$.next(this.manifest);
      if (!manifest.info.isDVR) {
        this.setHighlightedLine();
      } else {
        this.setHighlightedDVRLine();
      }
      setTimeout(() => {
        if (this.scrolling === 'tailManifest') {
          this.scrollInto$.next(this.manifest[this.manifest.length - 1]);
        }
      }, 0);
    } else {
      const isVttFile = this.currentUrl.includes('.vtt') || this.currentUrl.includes('.webvtt');
      this.setManifestUrl = this.currentUrl;
      this.masterManifest = this.manifest;
      this.manifestUrlIsMaster = true;
      this.manifest = manifest.lines;
      if (isVttFile) {
        const subtitles = this.manifest;
        this.subtitles$.next(subtitles);
      } else {
        this.masterVttManifest = {
          masterManifest: this.manifest,
          url: this.currentUrl,
        };
        this.manifest$.next(this.manifest);
      }
      this.tabs = this.getTabs(this.manifest);
      this.bandwidths = this.tabs.map((tab) => tab.map((obj) => Number(obj.bandwidth)));
    }
    this.manifestUpdate$.next(manifest);
  };

  private setActiveTab(url): void {
    const tabFound = this.tabs.some((tabArr, i) => {
      return tabArr.some((eachTab) => {
        const baseTabUrl = this.parserService.getBaseUrl(eachTab.url);
        const activeUrl = this.parserService.getBaseUrl(url);
        if (baseTabUrl.trim() === activeUrl.trim()) {
          this.activeRedundancy = i;
          this.activeBandwidth = Number(eachTab.bandwidth);
          return true;
        }
        return false;
      });
    });
    if (!tabFound) {
      this.activeRedundancy = -1;
      this.activeBandwidth = -1;
    }
  }

  private formattedDuplicates = (arr: TabObject[]): [TabObject[], TabObject[]] => {
    const uniques: TabObject[] = [];
    const duplicates: TabObject[] = [];
    arr.forEach((item: TabObject) => {
      if (uniques.find((newItems) => newItems.bandwidth === item.bandwidth)) {
        duplicates.push(item);
      } else {
        uniques.push(item);
      }
    });
    return [uniques, duplicates];
  };

  private getTabs = (man: ManifestLineObject[]): TabObject[][] => {
    const bandwidthExtract = /^(.*AVERAGE_BANDWIDTH=(\d+),|.*BANDWIDTH=(\d+),?)/;
    const dashBandwidthExtract = /^(.*bandwidth="(\d+)")/;
    const allTabs = man.reduce((accumulatedTabs: TabObject[], currentTab: ManifestLineObject, i: number) => {
      if (this.type === 'dash') {
        if (currentTab.url && currentTab.url.length && man[i - 1] && !currentTab.media) {
          const bandwidthRegEx = dashBandwidthExtract.exec(man[i - 1].str);
          accumulatedTabs.push({
            url: currentTab.url,
            bandwidth: (bandwidthRegEx && bandwidthRegEx[2]) || '',
          });
        }
      } else {
        if (currentTab.url && currentTab.url.length && man[i - 1] && !currentTab.media) {
          const bandwidthRegEx = bandwidthExtract.exec(man[i - 1].str);
          accumulatedTabs.push({
            url: currentTab.url,
            bandwidth: (bandwidthRegEx && bandwidthRegEx[3]) || '',
          });
        }
      }
      return accumulatedTabs;
    }, []);
    let tabs: TabObject[][] = (allTabs && this.formattedDuplicates(allTabs)) || [];
    while (tabs[tabs.length - 1].length > 1) {
      tabs = tabs.slice(0, -1).concat(this.formattedDuplicates(tabs[tabs.length - 1]));
    }
    return tabs.filter((e) => e && e.length);
  };

  private handleBandwidthChange = (bandwidth: string): void => {
    this.resetStatusIcon();
  };

  private onTimeUpdate = (val: number) => {
    if (!this.isDvrStream) {
      this.setHighlightedLine();
    }
  };

  private setHighlightedDVRLine = (): void => {
    const { currentFragment } = this;
    if (this.type === 'hls') {
      let currentFragmentTime;
      let currentFragDuration;
      this.manifest = this.manifest.map((line) => {
        if (line.url && currentFragment !== undefined) {
          const currentFragmentUrl = currentFragment.split('?')[0];
          line.highlight = line.url.includes(currentFragmentUrl);
          if (line.highlight) {
            currentFragmentTime = line.startTime;
            currentFragDuration = line.fragDuration;
          }
        }
        return line;
      });
      this.manifest = this.manifest.map((line) => {
        if (line.scteData && currentFragmentTime) {
          line.highlight =
            typeof line.startTime === 'number' &&
            line.startTime <= currentFragmentTime &&
            // these may not have a duration, so we wait after 2 seconds by default
            line.startTime + (currentFragDuration ?? 2) > currentFragmentTime;
        }
        return line;
      });
      this.manifest$.next(this.manifest);
    }
  };

  private setHighlightedLine = (): void => {
    if (this.type === 'hls') {
      let currentFragmentTime;
      let currentFragDuration;
      this.manifest = this.manifest?.map((line: ManifestLineObject, index: number) => {
        if (line.url) {
          line.highlight =
            typeof line.startTime === 'number' &&
            typeof line.fragDuration === 'number' &&
            line.startTime < this.viewerState.currentTime &&
            line.fragDuration + line.startTime > this.viewerState.currentTime;
          if (line.highlight) {
            currentFragmentTime = line.startTime;
            currentFragDuration = line.fragDuration;
          }
          if (line.highlight) {
            if (this.scrolling === 'autoScroll') {
              this.scrollInto$.next(this.manifest[Math.min(Math.max(index - this.scrollOffsetLines, 0), this.manifest.length - 1)]);
            }
          }
        }
        return line;
      });
      this.manifest = this.manifest.map((line) => {
        if (line.scteData && currentFragmentTime) {
          line.highlight =
            typeof line.startTime === 'number' &&
            line.startTime <= currentFragmentTime &&
            // these may not have a duration, so we wait after 2 seconds by default
            line.startTime + (currentFragDuration ?? 2) > currentFragmentTime;
        }
        return line;
      });
      this.manifest$.next(this.manifest);
    } else if (this.type === 'dash' && this.segments) {
      this.segments.map((segment: DashSegment, i: number) => {
        if (
          this.scrolling === 'autoScroll' &&
          segment.startTime < this.viewerState.currentTime &&
          segment.duration + segment.startTime > this.viewerState.currentTime
        ) {
          this.scrollInto$.next(segment);
        } else if (this.scrolling === 'tailManifest') {
          this.scrollInto$.next(this.segments[this.segments.length - 1]);
        }
      });
    }
  };

  private resetStatusIcon(): void {
    if (this.manifest) {
      this.manifest = this.manifest.map((line) => {
        if (line.loadStatus && !line.highlight) {
          line.loadStatus = '';
        }
        return line;
      });
      this.manifest$.next(this.manifest);
    }
  }

  private sameAsset = (assets: number, current: Viewer) => {
    const url = safeURL(current.url);
    const currentUrl = safeURL(this.currentUrl);
    return url.valid && currentUrl.valid && url.origin === currentUrl.origin ? assets + 1 : assets;
  };

  private mapFragStatus = (data: HlsTypes.FragLoadedData | HlsTypes.FragLoadingData, status: string) => {
    let trequest = 0;
    let tload = 0;
    if ((<HlsFragLoadedData>data).frag.stats) {
      // support for new release
      trequest = (<HlsFragLoadedData>data).frag.stats?.loading.start || 0;
      tload = (<HlsFragLoadedData>data).frag.stats?.loading.end || 0;
    } else {
      trequest = (<HlsFragLoadedData>data).stats?.trequest || 0;
      tload = (<HlsFragLoadedData>data).stats?.tload || 0;
    }
    const segmentDownloadTime = { trequest, tload };
    this.prepareManifestData(data, status, segmentDownloadTime);
    this.prepareDownloadData(data, segmentDownloadTime);
  };

  private prepareManifestData = (
    data: HlsTypes.FragLoadedData | HlsTypes.FragLoadingData,
    status: string,
    segmentDownloadTime: Record<string, number>
  ) => {
    if (this.manifest) {
      this.manifest = this.manifest.map((line) => {
        if (data.frag) {
          const { trequest, tload } = segmentDownloadTime;
          const checkForStats = (<HlsFragLoadedData>data).stats || (<HlsFragLoadedData>data).frag?.stats;
          data.frag.sn = data.frag.sn === 'initSegment' ? 0 : data.frag.sn;
          if (typeof line.startTime === 'number' && Math.round(line.startTime) === Math.round(data.frag.start)) {
            line.loadStatus = status;
            if (checkForStats && trequest && tload) {
              line.loadTime = Math.round(tload - trequest);
            }
            const fragRegex = DURATION_REGEX.exec(line.str);
            if (fragRegex && Number(fragRegex[1]) !== data.frag.duration) {
              const difference = Number(fragRegex[1]) - data.frag.duration;
              const fragCurrentDuration = data.frag.duration;
              const fragObject = {
                time: line.startTime ? line.startTime : -1,
                text: line.str,
                displayText: data.frag.sn + ' ' + ':' + ' ' + fragCurrentDuration,
              };
              if (fragObject.time !== -1 && (difference > 0.1 || difference < 0.1)) {
                this.viewerState.setFragDuration(fragObject);
              }
            }
          }
        }
        return line;
      });
      this.manifest$.next(this.manifest);
    }
  };

  private prepareDownloadData = (data: HlsTypes.FragLoadedData | HlsTypes.FragLoadingData, segmentDownloadTime: Record<string, number>) => {
    const { trequest, tload } = segmentDownloadTime;
    if (trequest && tload) {
      data.frag.sn = data.frag.sn === 'initSegment' ? 0 : data.frag.sn;
      const downloadData: DownloadData = {
        data: {
          series: {
            bitrateIndex: data.frag.type == 'audio' ? -1 : data.frag.level,
            segmentNumber: data.frag.sn,
            segmentType: data.frag.type,
            downloadTime: tload - trequest,
          },
          label: 0,
        },
        asset: this.currentSource,
        currentUrl: (<HlsFragLoadedData>data).frag.baseurl,
        viewerStateId: this.viewerState.id,
      };
      this.downloadManager.setDownloadData(downloadData);
    }
  };

  private onBandwidthUpdate = (bandwidth: number) => {
    this.currentBandwidth = bandwidth;
  };

  private onSubtitlesLoaded = (subtitles: ParsedManifest) => {
    this.subtitles = subtitles.lines;
    this.subtitles$.next(this.subtitles);
  };

  private onDashFragLoading = (segment) => {
    const formattedSegment = new DashSegment(segment);
    if (formattedSegment && typeof formattedSegment.startTime === 'number' && formattedSegment.duration) {
      this.addSegmentToSegments(formattedSegment);
    }
  };

  private onShakaFragLoaded = (requestContext: any) => {
    const request = requestContext.context;
    const bitrateIndex = this.dashBitrates.sort().indexOf(request.stream?.bandwidth || this.currentBandwidth);
    const downloadData: DownloadData = {
      data: {
        series: {
          bitrateIndex,
          segmentNumber: requestContext.currentSegmentNumber,
          segmentType: request.stream?.type,
          downloadTime: requestContext.downloadTimeMs,
        },
        label: 0,
      },
      asset: this.currentSource,
      currentUrl: request.segment?.getUris()[0],
      viewerStateId: this.viewerState.id,
    };
    this.downloadManager.setDownloadData(downloadData);
  };

  private addSegmentToSegments = (segment: DashSegment) => {
    const hasLoadedSegment: DashSegment = this.segments.filter((eachSegment) => {
      return eachSegment.startTime === segment.startTime;
    })[0];
    if (hasLoadedSegment) {
      const segmentIndex = this.segments.indexOf(hasLoadedSegment);
      this.segments.splice(segmentIndex, 1, segment);
    } else {
      this.segments.push(segment);
      setTimeout(() => {
        if (this.scrolling === 'tailManifest' && this.streamManifestContainer) {
          this.scrollInto$.next(this.segments[this.segments.length - 1]);
        }
      });
    }
    this.segments$.next(this.segments);
  };

  private onDashFragLoaded = (segment) => {
    this.prepareManifestDataForDash(segment);
    this.prepareDownloadDataForDash(segment);
  };

  private prepareManifestDataForDash(segment) {
    const formattedSegment: DashSegment = new DashSegment(segment);
    this.segments = this.segments.map((eachSegment, index) => {
      if (eachSegment.url === formattedSegment.url) {
        eachSegment.loadStatus = 'loaded';
        eachSegment.loadTime = eachSegment.calculateLoadTime(segment);
      }
      return eachSegment;
    });
    this.segments$.next(this.segments);
  }

  private prepareDownloadDataForDash(segment) {
    if (!isNaN(segment.index)) {
      const downloadData: DownloadData = {
        data: {
          series: {
            bitrateIndex: segment.mediaType == 'audio' ? -1 : segment.quality,
            segmentNumber: segment.index,
            segmentType: segment.mediaType,
            downloadTime: segment.requestEndDate.getTime() - segment.requestStartDate.getTime(),
          },
          label: 0,
        },
        asset: this.viewerState.url,
        currentUrl: this.viewerState.url,
        viewerStateId: this.viewerState.id,
      };
      this.downloadManager.setDownloadData(downloadData);
    }
  }

  private onDashFragLoadAbandon = (frag) => {
    console.log('[dash] on onFragLoadAbandon', frag);
  };

  private hlsError = (data: any) => {
    console.warn('HLS ERROR ', data.type, data.details);
    if (this.manifest && data.frag) {
      this.manifest.map((line) => {
        if (data.frag && line.startTime && Math.round(line.startTime) === Math.round(data.frag.start)) {
          line.loadStatus = 'fragErrored';
        }
      });
    }
  };

  public switchMuted = (muted: boolean) => {
    this.muted = muted;
  };

  public scrollToObject = (obj: Metric) => {
    const match = this.manifest.find((lineObj) => {
      return lineObj.startTime === obj.time && lineObj.str === obj.text;
    });
    if (match) {
      this.setScrolling({ viewerStateId: this.viewerState.id, currentScoll: ScrollTypes.NONE });
      this.scrollInto$.next(match);
      this.updatePlayerTime(Number(match.startTime));
    }
  };

  public updatePlayerTime(time: number): void {
    this.viewerState.updateTime(time);
  }

  private resetViewer(): void {
    this.tabs = [];
    this.bandwidths = [];
    this.params = '';
    this.stopPoll();
    this.clearManifest();
    this.currentUrl = '';
    this.setManifestUrl = '';
    this.manifestUrlIsMaster = false;
    this.res = { url: '' };
    this.viewerReset$.next();
  }

  public searchInputChange = (event: KeyboardEvent, term: string) => {
    if (event && event.key === 'Enter') {
      this.updateSearchTerm(term);
      let newSearchIndex = 0;
      newSearchIndex = this.getCurrentSearchIndex() + (event.shiftKey ? -1 : 1);
      const newSearch = this.searchMatches[newSearchIndex < 0 ? this.searchMatches.length - 1 : newSearchIndex % this.searchMatches.length];
      this.currentSearchMatch = newSearch;
      let filtered: DashSegment[] | ManifestLineObject[] = [];
      if (newSearch instanceof DashSegment) {
        filtered = this.segments.filter((eachSegment: DashSegment) => {
          return (
            newSearch &&
            eachSegment.url === newSearch.url &&
            eachSegment.duration === newSearch.duration &&
            eachSegment.startTime === newSearch.startTime
          );
        });
      } else {
        filtered = this.manifest.filter((eachLineObj: ManifestLineObject) => {
          return (
            newSearch &&
            eachLineObj.str === newSearch.str &&
            eachLineObj.url === newSearch.url &&
            eachLineObj.bandwidth === newSearch.bandwidth &&
            eachLineObj.startTime === newSearch.startTime
          );
        });
      }
      this.scrollInto$.next(filtered[0]);
    } else if (event && event.key === 'Escape') {
      this.toggleSearch(false);
    } else {
      this.updateSearchTerm(term);
    }
  };

  public getCurrentSearchIndex = (): number => {
    let sIndex = -1;
    if (this.searchMatches && this.currentSearchMatch) {
      if (this.currentSearchMatch instanceof DashSegment) {
        sIndex = (this.searchMatches as DashSegment[]).indexOf(this.currentSearchMatch);
      } else {
        sIndex = (this.searchMatches as ManifestLineObject[]).indexOf(this.currentSearchMatch);
      }
    }
    return sIndex;
  };

  private updateSearchTerm = (term: string) => {
    if (term !== this.currentTerm) {
      this.invalidRegEx = false;
      this.currentTerm = term || '';
      this.activeSearchTerm = this.currentTerm;
      if (this.manifest && this.currentTerm) {
        this.searchMatches =
          this.type === 'hls' || this.manifestView == 'manifest'
            ? this.manifest.filter((lineObj: ManifestLineObject) => {
                return lineObj.str && this.indexOfSearchTerm(lineObj.str, term) > -1;
              })
            : this.segments.filter((segment: DashSegment) => {
                return segment && this.indexOfSearchTerm(segment.url, term) > -1;
              });
        if (this.searchMatches[0]) {
          this.setScrolling({ viewerStateId: this.viewerState.id, currentScoll: ScrollTypes.NONE });
          this.currentSearchMatch = this.searchMatches[0];
          this.scrollInto$.next(this.searchMatches[0]);
        }
      } else if (!this.currentTerm) {
        this.searchMatches = [];
        this.currentSearchMatch = null;
        this.clearSearch();
      }
    }
  };

  private indexOfSearchTerm(line: string, term: string): number {
    if (term[0] === '/' && term[term.length - 1] === '/' && term.length > 2) {
      try {
        const termRegEx = new RegExp(`(${term.slice(1, -1)})`);
        if (''.match(termRegEx)) {
          this.invalidRegEx = true;
          return -1;
        }
        const match = line.match(termRegEx);
        if (match && match[1]) {
          return line.indexOf(match[1]);
        }
        return -1;
      } catch (e) {
        this.invalidRegEx = true;
        return -1;
      }
    }
    return line.toLowerCase().indexOf(term.toLowerCase());
  }

  public setViewerName = (name: string) => {
    this.setOption('name', name);
  };

  public toggleTempUrl = (url: string) => {
    this.currentUrl = url;
  };

  private clearSearch = () => {
    this.activeSearchTerm = '';
  };

  public toggleVideo = (show: boolean) => {
    this.setOption('showVideo', show);
  };

  public toggleSubtitles = (show: boolean) => {
    this.setOption('showSubtitles', show);
  };

  public toggleMute = (show: boolean) => {
    this.setOption('muteVideo', show);
  };

  public toggleHelp = (show: boolean) => {
    this.setOption('showHelp', show);
  };

  public toggleMetrics = (show: boolean) => {
    this.setOption('showMetrics', show);
  };

  public toggleCMCD = (show: boolean) => {
    this.setOption('showCMCD', show);
  };

  public togglePlayerConfig = (show: boolean) => {
    this.setOption('showPlayerConfig', show);
  };

  public toggleSegmentInspector = (show: SegmentInspector) => {
    this.setOption('segmentInspector', show);
  };

  public toggleScteDisplay = (show: boolean) => {
    this.setOption('showScteDisplay', show);
  };

  public toggleSegmentInspectorTool = (showInspector: SegmentInspector) => {
    this.setOption('segmentInspector', showInspector);
  };

  public toggleStallDetector = (show: boolean) => {
    this.setOption('showStallDetector', show);
  };

  public togglePlayerLogs = (show: boolean) => {
    this.setOption('showPlayerLogs', show);
  };

  public withCredentialsChange = (credentials: boolean) => {
    this.setOption('xhrCredentials', credentials);
  };

  public toggleManifestHeader = (show: boolean) => {
    this.hideManifestTopInputs = show;
  };

  public onGlobalTokenChange = (val: string) => {
    if (this.params && this.params.indexOf(this.currentGlobalToken) > -1) {
      this.params.replace(this.currentGlobalToken, '');
    }
    const formattedParams = (this.params && this.params.split('&')) || [];
    this.params = formattedParams
      .map((eachParam) => {
        if (eachParam === this.currentGlobalToken) {
          eachParam = val;
        }
        return eachParam;
      })
      .join('&');
    if (!this.params && this.viewerState.globalTokenActive) {
      this.params = val;
    }
    this.currentGlobalToken = val;
  };

  public onUseGlobalTokenChange = (active: boolean) => {
    this.setOption('globalTokenActive', active);
    const tokenIsInCurrentParams = this.params && this.currentGlobalToken && this.params.indexOf(this.currentGlobalToken) > -1;
    if (active) {
      if (this.params && !tokenIsInCurrentParams) {
        this.params += '&' + this.currentGlobalToken;
      } else if (!this.params) {
        this.params = this.currentGlobalToken;
      }
    } else {
      if (this.params && tokenIsInCurrentParams) {
        this.params = this.params
          .split('&')
          .filter((eachParam) => !eachParam.includes(this.currentGlobalToken))
          .join('&');
      }
    }
  };

  public toggleSearch = (open: boolean) => {
    this.searchOpen = open;
    if (this.searchOpen && this.searchInput) {
      setTimeout(() => this.searchInput.nativeElement.focus());
      this.activeSearchTerm = this.currentTerm;
    } else {
      this.clearSearch();
    }
  };

  public setOption = (option: keyof ViewerOptionTypes, value: any) => {
    this.viewerState.setOption(option, value);
  };

  public toggleVariantsViewer = () => (this.openedVariantsIds.length > 0 ? this.closeVariants() : this.openVariants());

  public closeVariants = () => this.openedVariantsIds.forEach((id) => this.closeViewer.emit(id));

  public closeVariantsHandler = (id: string) => {
    this.openedVariantsIds = this.openedVariantsIds.filter((openedId) => openedId !== id);
  };

  public openVariants = () => {
    const urls = this.manifest.map(({ url = '' }) => url).filter((url) => url !== '');
    urls.forEach((url) =>
      this.newViewerRequest.emit({
        url,
        onCreate: (viewer) => {
          viewer.viewerState.onClose.subscribe(this.closeVariantsHandler);
          this.openedVariantsIds = [...this.openedVariantsIds, viewer.id];
        },
        options: {
          name: DefaultViewerName,
          showVideo: false,
          muteVideo: false,
          useNative: false,
          showHelp: false,
          xhrCredentials: this.viewerState.xhrCredentials,
          globalTokenActive: this.viewerState.globalTokenActive,
          showMetrics: false,
          showCMCD: false,
          showPlayerConfig: false,
          segmentInspector: { show: false },
          showScteDisplay: false,
          showStallDetector: false,
          showPlayerLogs: false,
          showExplode: false,
          showSubtitles: false,
        },
      })
    );
  };

  public openNewViewer = (url: string) => {
    this.newViewerRequest.emit({
      url: url,
      options: {
        name: DefaultViewerName,
        showVideo: false,
        muteVideo: false,
        useNative: false,
        showHelp: false,
        xhrCredentials: this.viewerState.xhrCredentials,
        globalTokenActive: this.viewerState.globalTokenActive,
        showMetrics: false,
        showCMCD: false,
        showPlayerConfig: false,
        segmentInspector: { show: false },
        showScteDisplay: false,
        showStallDetector: false,
        showPlayerLogs: false,
        showSubtitles: false,
      },
    });
  };

  public clearViewer(): void {
    this.resetViewer();
    this.setOption('showVideo', false);
    this.setOption('showHelp', false);
    this.setOption('xhrCredentials', false);
    this.setOption('globalTokenActive', false);
    this.setOption('showMetrics', false);
    this.setOption('showCMCD', false);
    this.setOption('showStallDetector', false);
    this.setOption('showPlayerLogs', false);
    this.appService.setViewerName(this.id, DefaultViewerName);
    this.appService.setViewerId(this.id, '_generateNewId_');
    this.viewerState.updateSource('');
    this.manifestUpdate$.next(null);
    this.focusInput();
  }

  public clearManifest(): void {
    this.downloadManager.setDownloadData({
      data: { series: { downloadTime: -1 }, label: -1 },
      asset: this.currentSource,
      currentUrl: this.viewer.url,
      viewerStateId: this.viewerState.id,
    });
    this.manifest = [];
    this.segments = [];
    this.segments$.next([]);
    this.manifest$.next([]);
    this.inErrorState = false;
  }

  public setDropdownShow = (show: boolean) => {
    this.showInputDropdown = show;
  };

  public toggleOptionsMenu = (show: boolean) => {
    this.showOptionsMenu = show;
  };

  public onClickOutsideUrlInput = (event: MouseEvent) => {
    if (event.target && !this.isInInput(event.target)) {
      this.setDropdownShow(false);
    }
  };

  public onClickUrlInput = (event: MouseEvent) => {
    if (event.target && !this.isInInput(event.target)) {
      this.setDropdownShow(!this.showInputDropdown);
    }
  };
  public onEitherInputKeydown = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey)) {
      this.setDropdownShow(false);
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'v') {
      this.activeKey = true;
    }
    if (event.key === 'Enter') {
      if (!this.keyboardService.cntrlActive) {
        const newUrl = this.currentUrl;
        this.resetViewer();
        this.viewerState.updateUrl(newUrl);
        this.downloadManager.setDownloadData({
          data: { series: { downloadTime: -1 }, label: -1 },
          asset: this.currentSource,
          currentUrl: this.viewer.url,
          viewerStateId: this.viewerState.id,
        });
      } else {
        this.openNewViewer(this.currentUrl);
      }
    }
  };

  public onManifestTitleKeyUp = (event: KeyboardEvent) => {
    if (event && event.target && event.key === 'Enter') {
      (event.target as any).blur();
    }
  };

  public loadStoredViewer = (viewer: StoredViewer) => {
    if (this.keyboardService.cntrlActive) {
      this.newViewerRequest.emit({
        url: viewer.url + (viewer.options.globalTokenActive && this.currentGlobalToken ? '?' + this.currentGlobalToken : ''),
        options: viewer.options,
        id: viewer.id,
      });
    } else {
      this.setOption('showVideo', viewer.options.showVideo);
      this.setOption('useNative', viewer.options.useNative);
      this.setOption('xhrCredentials', viewer.options.xhrCredentials);
      this.setOption('globalTokenActive', viewer.options.globalTokenActive);
      this.setOption('showMetrics', viewer.options.showMetrics);
      this.setOption('showCMCD', viewer.options.showCMCD);
      this.resetViewer();
      this.downloadManager.setDownloadData({
        data: { series: { downloadTime: -1 }, label: -1 },
        asset: this.currentSource,
        currentUrl: this.viewer.url,
        viewerStateId: this.viewerState.id,
      });
      this.viewerState.updateUrl(
        viewer.url + (viewer.options.globalTokenActive && this.currentGlobalToken ? '?' + this.currentGlobalToken : '')
      );
      this.appService.setViewerId(this.id, viewer.id);
      this.appService.setViewerName(this.id, viewer.options.name);
      this.setOption('showPlayerConfig', viewer.options.showPlayerConfig);
      this.setOption('playerConfigs', viewer.options.playerConfigs);
      for (const player in viewer.options.playerConfigs) {
        const config = viewer.options.playerConfigs[player];
        this.viewerState.updatePlayerConfig(config, player as VideoPlayers);
      }
    }
  };

  private isInInput = (element: EventTarget) => {
    const classes = ['closeButton'];
    return classes.some((classname) => {
      return (element as any).classList.contains(classname);
    });
  };

  public focusInput = () => {
    if (this.manifestUrlInput) {
      setTimeout(() => this.manifestUrlInput.nativeElement.focus());
    }
  };

  public toggleMenu = () => {
    this.toggleValue = !this.toggleValue;
    this.saveMenuState(this.toggleValue);
  };

  private saveMenuState(menuState: boolean) {
    localStorage.setItem('menuState', `${menuState}`);
  }

  private loadMenuState() {
    this.toggleValue = localStorage.getItem('menuState') === 'true';
  }

  public playerSelector = (event: VideoPlayers) => {
    this.selectedPlayer = event;
    this.storageService.saveSelectedPlayer(event);
    this.viewerState.updatePlayerSelected(this.selectedPlayer);
  };

  public onSwapManifestView(text: string) {
    this.manifestView = text;
  }
}
