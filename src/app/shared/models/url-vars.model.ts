import { VideoPlayers } from './video-players';

export enum ScrollTypes {
  AUTO_SCROLL = 'autoScroll',
  TAIL_MANIFEST = 'tailManifest',
  NONE = 'none',
}

export enum VarNames {
  SHOWVIDEO = 'showVideo',
  MUTEVIDEO = 'muteVideo',
  SHOWHELP = 'showHelp',
  SHOWMETRICS = 'showMetrics',
  USECUSTOMPLAYERCONFIG = 'useCustomPlayerConfig',
  SHOWSTALLDETECTOR = 'showStallDetector',
  SHOWPLAYERLOGS = 'showPlayerLogs',
  SCROLLING = 'scrolling',
  XHRCREDENTIALS = 'xhrCredentials',
  MUTED = 'muted',
  URL = 'url',
  USEGLOBALTOKEN = 'globalToken',
  AUTOMATICPOLLING = 'automaticPolling',
  POLLINTERVAL = 'pollInterval',
  ENABLERELM = 'relm',
  USEHLSJS = 'useHlsjs',
  AUTOLOAD = 'autoLoad',
  VIDEOPLAYER = 'videoPlayer',
  CUSTOM_HLS_VERSION = 'hlsjsVersion',
  CUSTOM_DASH_VERSION = 'dashjsVersion',
  CUSTOM_SHAKA_VERSION = 'shakajsVersion',
  CUSTOM_SHAKADEBUG_VERSION = 'shakajsDebugVersion',
}
const REPLAY_PARAMS = ['cleanupTime', 'dvr', 'loop', 'sp', 'startTime', 'workflowId'];
export class UrlVars {
  public showVideo: boolean;
  public showSubtitles: boolean;
  public showHelp: boolean;
  public displayMetrics: boolean;
  public useCustomPlayerConfig: boolean;
  public displayStallDetector: boolean;
  public displayPlayerLogs: boolean;
  public scrolling: ScrollTypes;
  public credentials: boolean;
  public muted: boolean;
  public url: string;
  public automaticPolling: boolean;
  public pollInterval: number;
  public relm: boolean;
  public useGlobalToken: boolean;
  public useHlsjs: boolean;
  public autoLoad: boolean;
  public videoPlayer: string;
  public hlsjsVersion: string;
  public dashjsVersion: string;
  public shakajsVersion: string;
  public shakajsDebugVersion: string;

  /* tslint:disable:triple-equals */
  constructor(obj: any) {
    this.showVideo = this.checkForProperty(obj, VarNames.SHOWVIDEO);
    this.showHelp = this.checkForProperty(obj, VarNames.SHOWHELP);
    this.displayMetrics = this.checkForProperty(obj, VarNames.SHOWMETRICS);
    this.useCustomPlayerConfig = this.checkForProperty(obj, VarNames.USECUSTOMPLAYERCONFIG);
    this.displayStallDetector = this.checkForProperty(obj, VarNames.SHOWSTALLDETECTOR);
    this.displayPlayerLogs = this.checkForProperty(obj, VarNames.SHOWPLAYERLOGS);
    this.scrolling = this.checkForProperty(obj, VarNames.SCROLLING, false) ? obj[VarNames.SCROLLING] : ScrollTypes.AUTO_SCROLL;
    this.credentials = this.checkForProperty(obj, VarNames.XHRCREDENTIALS);
    this.muted = this.checkForProperty(obj, VarNames.MUTED);
    if (obj && obj[VarNames.URL]) {
      try {
        this.url = decodeURIComponent(obj[VarNames.URL]);
      } catch (e) {
        console.log(`error decoding option ${obj[VarNames.URL]} from url, continuing unencoded`);
        this.url = obj[VarNames.URL];
      }
      this.createUrlForReplayUi(obj);
    }
    this.useGlobalToken = this.checkForProperty(obj, VarNames.USEGLOBALTOKEN);
    this.automaticPolling = this.checkForProperty(obj, VarNames.AUTOMATICPOLLING);
    this.pollInterval = obj && !isNaN(Number(obj[VarNames.POLLINTERVAL])) ? Number(obj[VarNames.POLLINTERVAL]) : 6;
    this.relm = this.checkForProperty(obj, VarNames.ENABLERELM);
    this.useHlsjs = this.checkForProperty(obj, VarNames.USEHLSJS);
    this.autoLoad = this.checkForProperty(obj, VarNames.AUTOLOAD);
    this.videoPlayer = this.checkForProperty(obj, VarNames.VIDEOPLAYER, false) ? obj[VarNames.VIDEOPLAYER] : VideoPlayers.NONE;
    this.hlsjsVersion = this.checkForProperty(obj, VarNames.CUSTOM_HLS_VERSION, false) ? obj[VarNames.CUSTOM_HLS_VERSION] : '';
    this.dashjsVersion = this.checkForProperty(obj, VarNames.CUSTOM_DASH_VERSION, false) ? obj[VarNames.CUSTOM_DASH_VERSION] : '';
    this.shakajsVersion = this.checkForProperty(obj, VarNames.CUSTOM_SHAKA_VERSION, false) ? obj[VarNames.CUSTOM_SHAKA_VERSION] : '';
    this.shakajsDebugVersion = this.checkForProperty(obj, VarNames.CUSTOM_SHAKADEBUG_VERSION, false)
      ? obj[VarNames.CUSTOM_SHAKADEBUG_VERSION]
      : '';
  }

  private createUrlForReplayUi(obj: any) {
    const url = new URL(this.url);
    for (const [key, value] of Object.entries(obj)) {
      if (REPLAY_PARAMS.includes(key)) {
        url.searchParams.append(key, String(value));
      }
    }
    this.url = url.toString();
  }

  private checkForProperty(obj: any, propertyName: string, checkForEnabled = true) {
    if (obj && obj.hasOwnProperty(propertyName)) {
      return checkForEnabled ? Number(obj[propertyName]) === 1 : true;
    } else {
      return false;
    }
  }
}
