import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

import { UrlVarsService } from './url-vars.service';
import { SegmentInspector } from './viewer-state';

import { ScrollTypes } from '../../shared/models/url-vars.model';

export interface AppServiceScroll {
  viewerStateId: string;
  currentScoll: ScrollTypes;
}
@Injectable()
export class AppService {
  public showUrl$ = new Subject<string>();
  public showVideo$ = new Subject<boolean>();
  public showHelp$ = new Subject<boolean>();
  public muteVideo$ = new BehaviorSubject<boolean>(this.urlVarsService.urlVars.muted);
  public showSubtitles$ = new Subject<boolean>();
  public relm$ = new Subject<boolean>();
  public toggleScrolling$ = new BehaviorSubject<AppServiceScroll>({ currentScoll: ScrollTypes.NONE, viewerStateId: '' });
  public showPolling$ = new Subject<boolean>();
  public withCredentials$ = new Subject<boolean>();
  public pollInterval$ = new Subject<number>();
  public displayMetrics$ = new Subject<boolean>();
  public useCustomPlayerConfig$ = new Subject<boolean>();
  public displayCMCD$ = new Subject<boolean>();
  public displaySegmentInspector$ = new Subject<SegmentInspector>();
  public displayStallDetector$ = new Subject<boolean>();
  public displayPlayerLogs$ = new Subject<boolean>();
  public openRelmMenu$ = new Subject<boolean>();
  public relmUrl$ = new Subject<string>();
  public openSetManifest$ = new Subject<string>();
  public updatePlayerConfig$ = new Subject<string>();
  public openSidebar$ = new Subject<boolean>();
  public useGlobalToken$ = new Subject<boolean>();
  public globalTokenChange$ = new BehaviorSubject<string>('');
  public idChangeRequest$ = new Subject<{ prevId: string; curId: string }>();
  public nameChange$ = new Subject<{ id: string; name: string }>();
  public useNative$ = new Subject<boolean>();
  public currentScroll: { [id: string]: AppServiceScroll } = {};
  public isDrmModalOpen = false;
  public drmModalState = new BehaviorSubject({});
  public isDrmActive = false;

  constructor(private urlVarsService: UrlVarsService) {}

  public showTempUrl(val: string): void {
    this.showUrl$.next(val);
  }

  public toggleShowVideo(val: boolean): void {
    this.showVideo$.next(val);
  }

  public toggleShowHelp(val: boolean): void {
    this.showHelp$.next(val);
  }

  public toggleMuteVideo(val: boolean): void {
    this.muteVideo$.next(val);
  }

  public toggleShowSubtitles(val: boolean): void {
    this.showSubtitles$.next(val);
  }

  public enableRelm(val: boolean): void {
    this.relm$.next(val);
  }

  public setScrolling(val: AppServiceScroll): void {
    this.currentScroll[val.viewerStateId] = val;
    this.toggleScrolling$.next(val);
  }

  public toggleShowPollingService(val: boolean): void {
    this.showPolling$.next(val);
  }

  public toggleGlobalToken(val: boolean): void {
    this.useGlobalToken$.next(val);
  }

  public toggleCredentialsService(val: boolean): void {
    this.withCredentials$.next(val);
  }

  public toggleMetricsService(val: boolean): void {
    this.displayMetrics$.next(val);
  }

  public toggleCustomPlayerConfig(val: boolean): void {
    this.useCustomPlayerConfig$.next(val);
  }

  public toggleCMCDService(val: boolean): void {
    this.displayCMCD$.next(val);
  }

  public toggleSegmentInspectorService(val: SegmentInspector): void {
    this.displaySegmentInspector$.next(val);
  }

  public toggleStallDetectorService(val: boolean): void {
    this.displayStallDetector$.next(val);
  }

  public togglePlayerLogsService(val: boolean): void {
    this.displayPlayerLogs$.next(val);
  }

  public setPollInterval(val: number): void {
    this.pollInterval$.next(val);
  }

  public toggleRelmMenu(val: boolean): void {
    this.openRelmMenu$.next(val);
  }

  public emitRelm(val: string): void {
    this.relmUrl$.next(val);
  }

  public toggleSidebar(val: boolean): void {
    this.openSidebar$.next(val);
  }

  public updateSetManifestUrl(val: string): void {
    this.openSetManifest$.next(val);
  }

  public updatePlayerConfig(val: string): void {
    this.updatePlayerConfig$.next(val);
  }

  public setGlobalToken(val: string): void {
    this.globalTokenChange$.next(val);
  }

  public setViewerId(prevId: string, curId: string): void {
    this.idChangeRequest$.next({ prevId: prevId, curId: curId });
  }

  public setViewerName(id: string, name: string): void {
    this.nameChange$.next({ id: id, name: name });
  }

  public toggleNative(val: boolean): void {
    this.useNative$.next(val);
  }

  public toggleDrmModal(val: boolean): void {
    this.isDrmModalOpen = val;
  }

  public setDrmModalStateId(val: string) {
    this.drmModalState.next(val);
  }

  public toggleDrmStateStatus(val: boolean): void {
    this.isDrmActive = val;
  }
}
