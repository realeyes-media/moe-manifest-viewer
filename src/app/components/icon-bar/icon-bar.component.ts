import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { TabObjectName } from 'src/app/shared/models/tabs.model';
import {
  AppService,
  ViewerState,
  KeyboardService,
  ScrollTypes,
  StorageService,
  CopyService,
  ManifestLineObject,
  GoogleAnalyticsEventsService,
  SegmentInspector,
  VideoPlayers,
} from '../../shared';

const { version: appVersion } = require('./../../../../package.json');

@Component({
  selector: 'app-icon-bar',
  templateUrl: './icon-bar.component.html',
  styleUrls: ['./icon-bar.component.scss'],
})
export class IconBarComponent implements OnInit {
  @Input() public viewerState: ViewerState;
  @Input() public searchOpen: boolean;
  @Input() public id: string;
  @Input() public setManifestUrl: string;
  @Input() public currentUrl: string;
  @Input() public params: string;
  @Input() public manifest: ManifestLineObject[];
  @Input() public generatePermalinkUrl: Function;
  @Input() public type: 'hls' | 'dash' | 'unknown' | 'vtt';
  @Input() public selectedPlayer: VideoPlayers;
  @Input() public scrolling: ScrollTypes;
  @Input() public possibleNative: boolean;
  @Input() public pollingActive: boolean;
  @Input() public pollIntervalTime: number;
  @Input() public useNative: boolean;
  @Input() public showIconText: boolean;

  @Output() public onScrollingSet = new EventEmitter<ScrollTypes>();
  @Output() public onLoadClicked = new EventEmitter<void>();
  @Output() public onToggleSearch = new EventEmitter<boolean>();
  @Output() public onToggleVideo = new EventEmitter<boolean>();
  @Output() public onToggleHelp = new EventEmitter<boolean>();
  @Output() public onToggleUseNative = new EventEmitter<boolean>();
  @Output() public onToggleMetrics = new EventEmitter<boolean>();
  @Output() public onToggleCMCD = new EventEmitter<boolean>();
  @Output() public onTogglePlayerConfig = new EventEmitter<boolean>();
  @Output() public onToggleSegmentInspector = new EventEmitter<SegmentInspector>();
  @Output() public onToggleScteDisplay = new EventEmitter<boolean>();
  @Output() public onToggleStallDetector = new EventEmitter<boolean>();
  @Output() public onTogglePlayerLogs = new EventEmitter<boolean>();
  @Output() public onToggleUseGlobalToken = new EventEmitter<boolean>();
  @Output() public onTogglePolling = new EventEmitter<boolean>();
  @Output() public onToggleSubtitles = new EventEmitter<boolean>();
  @Output() public onSetPollIntervalTime = new EventEmitter<number>();
  @Output() public onToggleXhrCredentials = new EventEmitter<boolean>();
  @Output() public onClearViewer = new EventEmitter<void>();
  @Output() public newVariantsRequest = new EventEmitter<void>();

  public showScrollingOptions = false;
  public showPollingOptions = false;

  public storeViewerText = 'Save Viewer';
  public copyUrlText = 'Copy Current URL';
  public shiftCopyUrlText = 'Copy URI Encoded URL';
  public copyManifestText = 'Copy Manifest';
  public copyPermalinkText = 'Copy Permalink';
  public clearSessionText = 'Clear Session';
  public GA_CLICK = 'Click';
  public GA_ICON_BAR = 'Icon Bar';

  public ScrollTypes = ScrollTypes;

  public version = appVersion;

  constructor(
    public keyboardService: KeyboardService,
    public storageService: StorageService,
    public copyService: CopyService,
    public ga: GoogleAnalyticsEventsService,
    public appService: AppService
  ) {}

  public ngOnInit() {}

  public setScrolling = (scrollType: ScrollTypes) => {
    this.onScrollingSet.emit(scrollType);
    this.appService.setScrolling({ viewerStateId: this.viewerState.id, currentScoll: scrollType });
    this.setScrollingShow(false);
  };

  public submitEvent(Category: string, Action: string, Label: string) {
    this.ga.emitEvent(Category, Action, Label);
  }

  public explodeManifest = () => {
    this.newVariantsRequest.emit();
  };

  public loadClicked = () => {
    this.onLoadClicked.emit();
    this.submitEvent(this.GA_CLICK, 'Reload', this.GA_ICON_BAR);
  };

  public toggleSearch = (open: boolean) => {
    this.onToggleSearch.emit(open);
    this.submitEvent(this.GA_CLICK, 'Search:' + open, this.GA_ICON_BAR);
  };

  public toggleVideo = (toggled: boolean) => {
    this.onToggleVideo.emit(toggled);
    this.submitEvent(this.GA_CLICK, 'ToggleVideo:' + toggled, this.GA_ICON_BAR);
  };

  public toggleSubtitles = (toggled: boolean) => {
    this.onToggleSubtitles.emit(toggled);
    this.submitEvent(this.GA_CLICK, 'ToggleSubtitles:' + toggled, this.GA_ICON_BAR);
  };

  public toggleHelp = (toggled: boolean) => {
    this.onToggleHelp.emit(toggled);
    this.submitEvent(this.GA_CLICK, 'ToggleHelp' + toggled, this.GA_ICON_BAR);
  };

  public toggleHls = (toggled: boolean) => {
    this.onToggleUseNative.emit(toggled);
    this.submitEvent(this.GA_CLICK, 'UseNative:' + toggled, this.GA_ICON_BAR);
  };

  public toggleMetrics = (toggled: boolean) => {
    this.onToggleMetrics.emit(toggled);
    this.viewerState.updateActiveTab('Metrics', toggled);
    this.submitEvent(this.GA_CLICK, 'ToggleMetrics:' + toggled, this.GA_ICON_BAR);
  };

  public toggleCMCD = (toggled: boolean) => {
    this.onToggleCMCD.emit(toggled);
    this.viewerState.updateActiveTab('CMCD', toggled);
    this.submitEvent(this.GA_CLICK, 'ToggleCMCD:' + toggled, this.GA_ICON_BAR);
  };

  public togglePlayerConfig = (toggled: boolean) => {
    this.onTogglePlayerConfig.emit(toggled);
    this.viewerState.updateActiveTab('Player Config', toggled);
    this.submitEvent(this.GA_CLICK, 'TogglePlayerConfig:' + toggled, this.GA_ICON_BAR);
  };

  public toggleSegmentInspector = (toggled: boolean) => {
    const showInspector: SegmentInspector = { show: toggled };
    this.onToggleSegmentInspector.emit(showInspector);
    this.viewerState.updateActiveTab('Segment Inspector', toggled);
    this.submitEvent(this.GA_CLICK, 'ToggleSegmentInspector:' + toggled, this.GA_ICON_BAR);
  };

  public toggleScteDisplay = (toggled: boolean) => {
    this.onToggleScteDisplay.emit(toggled);
    this.viewerState.updateActiveTab(TabObjectName.SCTEDISPLAY, toggled);
    this.submitEvent(this.GA_CLICK, 'ToggleScteDisplay:' + toggled, this.GA_ICON_BAR);
  };

  public toggleStallDetector = (toggled: boolean) => {
    this.onToggleStallDetector.emit(toggled);
    this.viewerState.updateActiveTab('Stall Detector', toggled);
    this.submitEvent(this.GA_CLICK, 'ToggleStallDetector:' + toggled, this.GA_ICON_BAR);
  };

  public togglePlayerLogs = (toggled: boolean) => {
    this.onTogglePlayerLogs.emit(toggled);
    this.viewerState.updateActiveTab('Player Logs', toggled);
    this.submitEvent(this.GA_CLICK, 'TogglePlayerLogs:' + toggled, this.GA_ICON_BAR);
  };

  public toggleUseGlobalToken = (toggled: boolean) => {
    this.onToggleUseGlobalToken.emit(toggled);
    this.submitEvent(this.GA_CLICK, 'UseGlobalToken:' + toggled, this.GA_ICON_BAR);
  };

  public togglePolling = (toggled: boolean) => {
    this.onTogglePolling.emit(toggled);
    this.showPollingOptions = false;
    this.submitEvent(this.GA_CLICK, 'TogglePolling:' + toggled, this.GA_ICON_BAR);
  };

  public setPollIntervalTime = (time: number) => {
    this.onSetPollIntervalTime.emit(Number(time));
    this.submitEvent(this.GA_CLICK, 'SetPollIntervalTime:' + time, this.GA_ICON_BAR);
  };

  public toggleXhrCredentials = (toggled: boolean) => {
    this.onToggleXhrCredentials.emit(toggled);
    this.submitEvent(this.GA_CLICK, 'ToggleXhrCredentials:' + toggled, this.GA_ICON_BAR);
  };

  public clearViewer = () => {
    const previousStoreText = this.clearSessionText;
    this.onClearViewer.emit();
    this.clearSessionText = 'Clear success ✅';
    this.submitEvent(this.GA_CLICK, 'ClearViewer', this.GA_ICON_BAR);
    setTimeout(() => {
      this.clearSessionText = previousStoreText;
    }, 1000);
  };

  public saveCurrentViewer = (): void => {
    const previousStoreText = this.storeViewerText;
    this.submitEvent(this.GA_CLICK, 'SaveCurrentViewer', this.GA_ICON_BAR);
    this.storageService
      .saveViewer(this.id, (this.setManifestUrl || this.currentUrl || '') + this.params, {
        showVideo: this.viewerState.showVideo,
        muteVideo: this.viewerState.muteVideo,
        useNative: this.viewerState.useNative,
        showHelp: this.viewerState.showHelp,
        xhrCredentials: this.viewerState.xhrCredentials,
        name: this.viewerState.name,
        globalTokenActive: this.viewerState.globalTokenActive,
        showMetrics: this.viewerState.showMetrics,
        showCMCD: this.viewerState.showCMCD,
        showPlayerConfig: this.viewerState.showPlayerConfig,
        playerConfigs: this.viewerState.playerConfigs,
        segmentInspector: this.viewerState.segmentInspector,
        showScteDisplay: this.viewerState.showScteDisplay,
        showStallDetector: this.viewerState.showStallDetector,
        showPlayerLogs: this.viewerState.showPlayerLogs,
        showSubtitles: this.viewerState.showSubtitles,
      })
      .then(() => {
        this.storeViewerText = 'Stored ✅';
      })
      .catch(() => {
        this.storeViewerText = 'Error on Save';
      });
    setTimeout(() => {
      this.storeViewerText = previousStoreText;
    }, 1000);
  };

  public copyText = (url: string, event: MouseEvent) => {
    this.submitEvent(this.GA_CLICK, 'CopyText', this.GA_ICON_BAR);
    const originalText = this.copyUrlText;
    const originalShiftText = this.shiftCopyUrlText;
    url = this.currentUrl ? this.currentUrl + this.params : '';
    if (event.shiftKey && url) {
      url = encodeURIComponent(url);
    }
    this.copyService
      .copyText(url)
      .then(() => {
        this.copyUrlText = 'Copy success ✅';
        this.shiftCopyUrlText = 'Copy success ✅';
        setTimeout(() => {
          this.copyUrlText = originalText;
          this.shiftCopyUrlText = originalShiftText;
        }, 1000);
      })
      .catch(() => {
        this.copyUrlText = 'Copy Failed ❎';
        this.shiftCopyUrlText = 'Copy Failed ❎';
        setTimeout(() => {
          this.copyUrlText = originalText;
          this.shiftCopyUrlText = originalShiftText;
        }, 3000);
      });
  };

  public copyManifest(): void {
    this.submitEvent(this.GA_CLICK, 'CopyManifest', this.GA_ICON_BAR);
    const originalText = this.copyManifestText;
    this.copyManifestText = 'Copying...';
    if (this.manifest) {
      const textToCopy = this.manifest.map((obj) => obj.str).join('\n');
      this.copyService
        .copyText(textToCopy)
        .then(() => {
          this.copyManifestText = 'Copy success ✅';
          setTimeout(() => {
            this.copyManifestText = originalText;
          }, 1000);
        })
        .catch(() => {
          this.copyManifestText = 'Copy Failed ❎';
          setTimeout(() => {
            this.copyManifestText = originalText;
          }, 3000);
        });
    }
  }

  public copyPermalinkUrl = () => {
    const originalText = this.copyPermalinkText;
    const textToCopy = this.generatePermalinkUrl();
    this.submitEvent(this.GA_CLICK, 'CopyPermalinkUrl', this.GA_ICON_BAR);
    this.copyService
      .copyText(textToCopy)
      .then(() => {
        this.copyPermalinkText = 'Copy success ✅';
        setTimeout(() => {
          this.copyPermalinkText = originalText;
        }, 1000);
      })
      .catch(() => {
        this.copyPermalinkText = 'Copy Failed ❎';
        setTimeout(() => {
          this.copyPermalinkText = originalText;
        }, 3000);
      });
  };

  public openDemoPage = () => {
    this.submitEvent(this.GA_CLICK, 'OpenDemoPage', this.GA_ICON_BAR);
    window.open(this.generateMetricsUrl(), '_blank');
  };

  public openFeedbackPage = () => {
    this.submitEvent(this.GA_CLICK, 'OpenFeedbackPage', this.GA_ICON_BAR);
    window.open('https://docs.google.com/forms/d/1z5lzDjGy5PLadpxp2awVU67KuLRnB9aJYzOqtzDoYAA/prefill');
  };

  public generateMetricsUrl(): string {
    if (this.type === 'dash') {
      return `http://reference.dashif.org/dash.js/1.3.0/samples/dash-if-reference-player/index.html?url=${
        this.params ? this.currentUrl + this.params : this.currentUrl
      }`;
    }
    const currentSrc = this.currentUrl ? `src=${encodeURIComponent(this.params ? this.currentUrl + this.params : this.currentUrl)}&` : '';
    return `https://hls-js.netlify.app/demo/${
      `?` + currentSrc + `enableStreaming=true&autoRecoverError=true&enableWorker=true&levelCapping=-1&defaultAudioCodec=undefined`
    }`;
  }

  public setScrollingShow = (show: boolean) => {
    this.showScrollingOptions = show;
    this.submitEvent(this.GA_CLICK, 'SetScrollingShow:' + show, this.GA_ICON_BAR);
  };

  public setPollingShow = (show: boolean, event: Event) => {
    event.stopPropagation();
    if (this.viewerState._showPolling === true) {
      this.showPollingOptions = show;
      this.submitEvent(this.GA_CLICK, 'SetPollingShow:' + show, this.GA_ICON_BAR);
    }
  };

  public closePollingShow = (show: boolean) => {
    this.showPollingOptions = show;
  };
  public isFragmentToInspect() {
    if (this.manifest && this.manifest.length > 0) {
      return this.manifest.some((manifest) => {
        const { url = '' } = manifest;
        return url.includes('.ts') || url.includes('.mp4');
      });
    }
  }

  public toggleDrmModal() {
    const drmModalOpen = !this.appService.isDrmModalOpen;
    this.appService.toggleDrmModal(drmModalOpen);
    if (drmModalOpen === true) {
      this.appService.setDrmModalStateId(this.viewerState.id);
    }
  }
}
