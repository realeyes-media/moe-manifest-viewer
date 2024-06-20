import { Component, OnInit, ViewChild, ElementRef, EventEmitter, Output, OnDestroy } from '@angular/core';
import {
  UrlVarsService,
  AppService,
  StorageService,
  StoredViewer,
  ViewerOptionTypes,
  UserAgentUtil,
  PlayerConfigs,
  VideoPlayers,
} from '../../shared';
import { UrlVars, VarNames } from '../../shared';
import { GoogleAnalyticsEventsService } from './../../shared/services/ga.service';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

const { version: appVersion } = require('./../../../../package.json');

type CustomLibraryScriptType = 'hls' | 'dash' | 'shaka' | 'shakaDebug';
enum customLibraryScript {
  HLS = 'hls',
  DASH = 'dash',
  SHAKA = 'shaka',
  SHAKA_Debug = 'shakaDebug',
}

@Component({
  selector: 'app-options-modal',
  templateUrl: 'options-modal.component.html',
  styleUrls: ['options-modal.component.scss'],
})
export class OptionsModalComponent implements OnInit, OnDestroy {
  @Output() public close: EventEmitter<void> = new EventEmitter<void>();
  @Output() public openRelm: EventEmitter<void> = new EventEmitter<void>();

  @ViewChild('urlInput', { static: true }) public urlInput: ElementRef;

  public url: string;
  public manifestUrls: string[];

  public showVideo: boolean;
  public showHelp: boolean;
  public muteVideo: boolean;
  public relm: boolean;
  public showPolling: boolean;
  public useNative = true;

  public withCredentials: boolean;
  public displayMetrics: boolean;
  public displayStallDetector: boolean;
  public displayPlayerLogs: boolean;
  public seconds = 6;
  public optionsChecked: { prop: string; value: boolean }[] = new Array();

  public globalToken: string;
  public useGlobalToken = false;
  public possibleNative: boolean;

  public settingsClearButtonText = 'Clear settings storage';
  public version = appVersion;
  public showInputDropdown = false;

  public clearSettingsConfirmationPanelToggled = false;

  public termsCookieExists = false;

  public useCustomHlsVersion = false;
  public customHlsVersion: string;

  public useCustomDashVersion = false;
  public customDashVersion: string;

  public useCustomShakaVersion = false;
  public customShakaVersion: string;
  public customLibraryScript = customLibraryScript;

  public useCustomPlayerConfig = false;
  public customPlayerConfig: string;

  private ngUnsubscribe: Subject<void> = new Subject<void>();

  private viewerStateId = '';
  private isDrmModalOpen = false;

  public isPlayerSelected: boolean;

  constructor(
    public urlVarsService: UrlVarsService,
    public appService: AppService,
    public storageService: StorageService,
    public ga: GoogleAnalyticsEventsService,
    private toastrService: ToastrService
  ) {
    this.possibleNative = UserAgentUtil.possibleNative;
  }

  public ngOnInit() {
    this.checkTermsCookie();
    this.setCookiedToken();
    this.subscribeToCommands();
    this.getDefaultScriptsVersion();
    // TODO: find way to apply w/o settimeout
    if (this.url) {
      setTimeout(() => {
        this.url = this.url + ' ';
        setTimeout(() => {
          this.url = this.url.slice(0, -1);
        }, 0);
      }, 0);
    }
    setTimeout(this.applyUrlVars);
    this.urlInput?.nativeElement?.focus();
    this.isPlayerSelected = !!this.storageService.getSelectedPlayer();
  }

  public ngOnDestroy() {
    this.ngUnsubscribe.next();
  }

  public subscribeToCommands = () => {
    this.appService.showVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.showVideo = val;
    });
    this.appService.muteVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.muteVideo = val;
    });
    this.appService.relm$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.relm = val;
    });
    this.appService.showPolling$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.showPolling = val;
    });
    this.appService.pollInterval$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: number) => {
      this.seconds = val;
    });
    this.appService.withCredentials$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.withCredentials = val;
    });
    this.appService.displayMetrics$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.displayMetrics = val;
    });
    this.appService.useCustomPlayerConfig$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.useCustomPlayerConfig = val;
    });
    this.appService.displayStallDetector$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.displayStallDetector = val;
    });
    this.appService.displayPlayerLogs$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.displayPlayerLogs = val;
    });

    this.appService.useGlobalToken$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.useGlobalToken = val;
    });

    this.appService.showHelp$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.showHelp = val;
    });

    this.appService.useNative$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((val: boolean) => {
      this.useNative = val;
    });
  };

  public applyUrlVars = () => {
    const vars = this.urlVarsService.urlVars;
    Object.keys(vars).forEach((urlVar: keyof UrlVars) => {
      switch (urlVar) {
        case VarNames.URL:
          if (vars[urlVar]) {
            this.url = vars[urlVar];
          }
          break;
        case 'showVideo':
          if (vars[urlVar]) {
            this.appService.toggleShowVideo(true);
          }
          break;
        case 'useHlsjs':
          if (vars[urlVar]) {
            this.appService.toggleNative(false);
          }
          break;
        case 'muted':
          if (vars[urlVar]) {
            this.appService.toggleMuteVideo(true);
          }
          break;
        case 'displayMetrics':
          if (vars[urlVar]) {
            this.appService.toggleMetricsService(true);
          }
          break;
        case 'useCustomPlayerConfig':
          if (vars[urlVar]) {
            this.appService.toggleCustomPlayerConfig(true);
          }
          break;
        case 'displayStallDetector':
          if (vars[urlVar]) {
            this.appService.toggleStallDetectorService(true);
          }
          break;
        case 'displayPlayerLogs':
          if (vars[urlVar]) {
            this.appService.togglePlayerLogsService(true);
          }
          break;
        case 'scrolling':
          this.appService.setScrolling({ currentScoll: vars[urlVar], viewerStateId: this.viewerStateId });
          break;
        case 'credentials':
          if (vars[urlVar]) {
            this.appService.toggleCredentialsService(true);
          }
          break;
        case 'automaticPolling':
          if (vars[urlVar]) {
            this.appService.toggleShowPollingService(true);
          }
          break;
        case 'pollInterval':
          this.appService.setPollInterval(vars[urlVar]);
          break;
        case 'useGlobalToken':
          if (vars[urlVar]) {
            this.appService.toggleGlobalToken(true);
          }
          break;
        case 'relm':
          if (vars[urlVar]) {
            this.appService.enableRelm(true);
          }
          break;
        case 'useHlsjs':
          if (vars[urlVar]) {
            this.appService.toggleNative(false);
          }
          break;
        case 'showHelp':
          if (vars[urlVar]) {
            this.appService.toggleShowHelp(true);
          }
          break;
        case VarNames.AUTOLOAD:
          if (this.url && vars[urlVar] === true) {
            this.loadUrl();
          }
          break;
        case VarNames.CUSTOM_HLS_VERSION:
          if (vars[urlVar]) {
            this.useCustomHlsVersion = true;
            this.customHlsVersion = String(vars[urlVar]);
          }
          break;
        case VarNames.CUSTOM_DASH_VERSION:
          if (vars[urlVar]) {
            this.useCustomDashVersion = true;
            this.customDashVersion = String(vars[urlVar]);
          }
          break;
        case VarNames.CUSTOM_SHAKA_VERSION:
          if (vars[urlVar]) {
            this.useCustomShakaVersion = true;
            this.customShakaVersion = String(vars[urlVar]);
          }
          break;
        case VarNames.CUSTOM_SHAKADEBUG_VERSION:
          if (vars[urlVar]) {
            this.useCustomShakaVersion = true;
            this.customShakaVersion = String(vars[urlVar]);
          }
          break;
      }
    });
  };

  public setOnAppService = (prop, value) => {
    this.optionsChecked.push(prop, value);
    this.appService[prop](value);
  };

  public onIntervalChange(val: number): void {
    this.appService.setPollInterval(val);
  }

  public relmClicked = () => {
    this.openRelm.emit();
    this.toggleOptions(false);
  };

  public clickLogo = () => {
    window.open('http://www.realeyes.com', '_blank');
  };

  public loadGlobalToken = (token: string) => {
    if (token) {
      this.storageService.setGlobalTokenCookie(token);
    } else {
      this.storageService.deleteGlobalTokenCookie(token);
    }
    this.appService.setGlobalToken('?' + token);
  };

  public toggleUseGlobalToken(open: boolean): void {
    this.appService.toggleGlobalToken(open);
  }

  public toggleCustomScriptVersion(toggle: boolean, type: CustomLibraryScriptType): void {
    switch (type) {
      case customLibraryScript.HLS:
        this.useCustomHlsVersion = toggle;
        break;
      case customLibraryScript.DASH:
        this.useCustomDashVersion = toggle;
        break;
      case customLibraryScript.SHAKA:
        this.useCustomShakaVersion = toggle;
        break;
      default:
        break;
    }
  }

  public loadCustomScriptVersion(version: string, type: CustomLibraryScriptType): void {
    // TODO: need to add a method to check minimum version
    (<any>window)
      .getLibrary(version, type)
      .then((res) => {
        console.log('[loadCustomHlsVersion > getLibrary] res: ', res);

        if (String(res?.versionNumber) === String(version)) {
          this.toastrService.success(`Loading ${type} Done. using version ${res.versionNumber}`, '');
        } else {
          this.toastrService.error(
            `Failed to get ${type} version ${version}. Using default ${type} version ${res.versionNumber}`,
            `Loading ${version} failed`
          );
        }
      })
      .catch((err) => {
        console.error('[loadCustomHlsVersion > getLibrary] err: ', err);
        this.toastrService.error('Loading script failed', '');
      });
  }

  public async getDefaultScriptsVersion() {
    const hls = await (<any>window).hlsjsLibrary;
    if (!this.customHlsVersion) {
      this.customHlsVersion = hls?.versionNumber;
    }
    const dash = await (<any>window).dashjsLibrary;
    if (!this.customDashVersion) {
      this.customDashVersion = dash?.versionNumber;
    }
    const shaka = await (<any>window).shakajsLibrary;
    if (!this.customShakaVersion) {
      this.customShakaVersion = shaka?.versionNumber;
    }
  }

  public toggleCustomPlayerConfig(toggle: boolean): void {
    this.setOnAppService('toggleCustomPlayerConfig', toggle);

    if (!toggle) {
      this.customPlayerConfig = '';
    }
  }

  public loadCustomPlayerConfig(): void {
    if (this.useCustomPlayerConfig && this.customPlayerConfig) {
      try {
        JSON.parse(this.customPlayerConfig);
        this.appService.updatePlayerConfig(this.customPlayerConfig);
      } catch (error) {
        this.toastrService.error(`The config entered doesn't have the correct JSON structure.`, `Loading the player config failed`);
        throw new Error(error.message);
      }
    }
  }

  public toggleOptions(val: boolean): void {
    if (this.termsCookieExists) {
      this.close.emit();
    }
  }

  public toggleInputDropdown = (val: boolean) => {
    this.showInputDropdown = val;
  };

  public submitEvent(Category: string, Action: { prop: string; value: boolean }[], Label: string) {
    this.ga.emitEvent(Category, JSON.stringify(Action), Label);
  }

  public loadUrl(): void {
    try {
      this.loadCustomPlayerConfig();
    } catch (error) {
      throw new Error(error.message);
    }

    const url = this.url;
    this.appService.updateSetManifestUrl(url);
    this.toggleOptions(false);
    this.submitEvent('Load Url Initial Menu', this.optionsChecked, 'Initial Menu');
  }

  public activateClearSettingsConfirmationPanel() {
    this.clearSettingsConfirmationPanelToggled = true;
  }

  public closeClearSettingsConfirmationPanel() {
    this.clearSettingsConfirmationPanelToggled = false;
  }

  public clearSettingsCookie() {
    this.storageService.clearStorage();
    const previousText = this.settingsClearButtonText;
    this.settingsClearButtonText = 'Cleared!';
    setTimeout(() => {
      this.settingsClearButtonText = previousText;
    }, 500);
    this.clearSettingsConfirmationPanelToggled = false;
  }

  public loadStoredViewer = (viewer: StoredViewer) => {
    this.url = viewer.url;
    this.appService.showTempUrl(this.url);
    Object.keys(viewer.options).forEach((option: keyof ViewerOptionTypes) => {
      switch (option) {
        case 'showVideo':
          this.appService.toggleShowVideo(viewer.options[option]);
          break;
        case 'muteVideo':
          this.appService.toggleMuteVideo(viewer.options[option]);
          break;
        case 'useNative':
          this.appService.toggleNative(viewer.options[option]);
          break;
        case 'xhrCredentials':
          this.appService.toggleCredentialsService(viewer.options[option]);
          break;
        case 'globalTokenActive':
          this.appService.toggleGlobalToken(viewer.options[option]);
          break;
        case 'showMetrics':
          this.appService.toggleMetricsService(viewer.options[option]);
          break;
        case 'showPlayerConfig':
          this.appService.toggleCustomPlayerConfig(viewer.options[option]);
          if (viewer.options.playerConfigs) {
            this.updateCurrentConfig(viewer.options.playerConfigs);
          }
          break;
        case 'showStallDetector':
          this.appService.toggleStallDetectorService(viewer.options[option]);
          break;
        case 'showPlayerLogs':
          this.appService.togglePlayerLogsService(viewer.options[option]);
      }
    });
    this.appService.setViewerId('', viewer.id);
    this.viewerStateId = viewer.id;
    this.appService.setViewerName('', viewer.options.name);
    this.toggleInputDropdown(false);
  };

  public updateCurrentConfig = (playerConfigs: PlayerConfigs) => {
    const currentPlayer: VideoPlayers = this.storageService.getSelectedPlayer();
    for (const player in playerConfigs) {
      if (player === currentPlayer) {
        this.customPlayerConfig = playerConfigs[player];
        if (playerConfigs[player]) {
          this.toggleCustomPlayerConfig(true);
        }
      }
    }
  };

  public onClickOutsideUrlInput = (event: MouseEvent) => {
    if (event.target && !this.isInInput(event.target)) {
      this.toggleInputDropdown(false);
    }
  };

  public onClickUrlInput = (event: MouseEvent) => {
    if (event.target && !this.isInInput(event.target)) {
      this.toggleInputDropdown(!this.showInputDropdown);
    }
  };

  public onInputKeyup = (event: KeyboardEvent) => {
    this.toggleInputDropdown(false);
    if (event.code === 'Enter') {
      this.loadUrl();
    }
  };

  public onClickOutside(val: MouseEvent): void {
    if (window.getSelection()?.toString()) {
      return;
    }
    if (val.target && !this.isInInput(val.target) && this.isDrmModalOpen === false) {
      this.toggleOptions(false);
    }
  }
  private setCookiedToken(): void {
    this.globalToken = this.storageService.getGlobalToken();
    this.appService.setGlobalToken(this.globalToken);
  }

  private checkTermsCookie(): void {
    if (document.cookie.indexOf('termsCookie') > -1) {
      this.termsCookieExists = true;
    }
  }

  public acceptTerms(): void {
    document.cookie = 'termsCookie' + '=' + 'termsCookie';
    this.termsCookieExists = true;
  }

  public addDrmSupport(): void {
    const drmModalOpen = !this.appService.isDrmModalOpen;
    this.appService.toggleDrmModal(drmModalOpen);
    if (drmModalOpen === true) {
      const stateId = 'global';
      this.appService.setDrmModalStateId(stateId);
      this.isDrmModalOpen = true;
    }
  }

  private isInInput = (element: EventTarget) => {
    const classes = ['closeButton', 'eachViewer', 'eachViewerText', 'yesButton', 'noButton', 'acceptTerms'];
    return classes.some((classname) => {
      return (element as any).classList.contains(classname);
    });
  };
}
