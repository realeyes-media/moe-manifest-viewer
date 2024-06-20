import { Component, OnInit, Input, ViewChild, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs/index';

import { ParsedManifest, ManifestLineObject, ViewerState, StallDetectorStatuses } from '../../shared';

import { IGNORE_MEDIA_TAG, LAST_FRAGMENT_REGEX } from '../../shared/models/hls-regex.model';
import { takeUntil } from 'rxjs/operators';

export interface ManifestLevel {
  isStall?: boolean;
  lastFragSeenCount?: number;
  uri: string;
  status: string;
  fullUrl?: string;
  lastFrag?: string;
  lastFragNumber?: string;
  isLive?: boolean;
  isRollback?: boolean;
  prevFragNumber?: number;
}

@Component({
  selector: 'app-stall-detector',
  templateUrl: './stall-detector.component.html',
  styleUrls: ['./stall-detector.component.scss'],
})
export class StallDetectorComponent implements OnInit, OnDestroy {
  @Input() public manifestUpdate$: BehaviorSubject<ParsedManifest | null>;
  @Input() public viewerReset$: Subject<void>;
  @Input() public viewerState: ViewerState;

  public masterManifestUrl = 'Master manifest not detected';
  public masterManifestData = '';
  public pollInterval: number;
  public stallThreshold: number;
  public isViewerUpdated = false;
  public manifestLevels: ManifestLevel[];
  public valueVol = 50;
  public showMasterUrl: boolean;
  public urlText = 'Show Master Url';

  private levelPollingInterval;
  private isAlarmPlaying = false;
  private ngUnsubscribe: Subject<void> = new Subject<void>();
  private alarmElement: HTMLAudioElement | null;

  constructor() {
    if (!localStorage.getItem('stallThreshold')) {
      this.stallThreshold = 3;
    } else {
      this.getStallThreshold();
    }
    if (!localStorage.getItem('pollInterval')) {
      this.pollInterval = 6000;
    } else {
      this.getPollInterval();
    }
  }

  public ngOnInit() {
    this.manifestUpdate$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onManifestUpdate);
    this.viewerReset$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onViewerReset);
    this.alarmElement = document.querySelector('.alarm');
    if (this.alarmElement) {
      this.alarmElement.onended = () => {
        this.isAlarmPlaying = false;
      };
    }
  }

  public ngOnDestroy() {
    this.stopPolling();
    this.ngUnsubscribe.next();
  }

  public onReloadClick = (master = true) => {
    this.getStallThreshold();
    this.getPollInterval();
    this.isViewerUpdated = true;
    this.stopPolling();
    if (master) {
      this.fetchMasterManifest()
        .then(this.parseMasterManifest)
        .then(this.fetchManifestLevels)
        .then(this.detectStall)
        .then(this.startPolling);
    } else {
      this.fetchManifestLevels().then(this.detectStall).then(this.startPolling);
    }
  };

  public onManifestUpdate = (manifest: ParsedManifest) => {
    if (manifest && !this.isViewerUpdated) {
      this.masterManifestUrl = manifest.masterUrl ? manifest.masterUrl : this.masterManifestUrl;
      if (manifest.info.level === 'master') {
        this.masterManifestUrl = manifest.url;
        this.onReloadClick();
      } else {
        this.manifestLevels = [
          {
            uri: manifest.url,
            status: '',
          },
        ];
        this.onReloadClick(false);
      }
    }
  };

  public onViewerReset = () => {
    this.stopPolling();
    this.isViewerUpdated = false;
  };

  public poll = () => {
    this.fetchManifestLevels().then(this.detectStall);
  };

  private fetchMasterManifest = () => {
    this.masterManifestData = 'Loading...';
    return fetch(this.masterManifestUrl, this.viewerState.xhrCredentials ? { credentials: 'include' } : {})
      .then((response) => response.text())
      .then((manifestStr) => (this.masterManifestData = manifestStr));
  };

  private parseMasterManifest = () => {
    const levels: string[] = this.masterManifestData
      .split('\n')
      .filter((line) => line.trim() && (line.indexOf('#') === -1 || line.indexOf('URI=') !== -1));
    const matchedSites = levels.filter((level) => !IGNORE_MEDIA_TAG.test(level));
    this.manifestLevels = matchedSites.map((level) => {
      if (level.indexOf('URI=') !== -1) {
        level = this.getUri(level);
      }

      return {
        uri: level,
        status: '↻ loading',
      };
    });
  };

  private getUri = (line: string) => {
    const uriPair: { key: string; value: string } | null =
      line
        .split(/:(.*)/)[1]
        .split(',')
        .map((pair) => {
          return { key: pair.split(/=(.*)/)[0], value: pair.split(/=(.*)/)[1] };
        })
        .find((pair) => pair.key === 'URI') || null;
    return (uriPair && uriPair.value.replace(/"/g, '')) || '';
  };

  private fetchManifestLevels = () => {
    return Promise.all(
      this.manifestLevels.map((level) => {
        const fullUrl = '';
        if (level.uri.indexOf('http') === 0) {
          level.fullUrl = level.uri;
        } else if (level.uri.indexOf('/') !== 0) {
          level.fullUrl = '\n' + this.masterManifestUrl.split('?')[0].split('/').reverse().slice(1).reverse().join('/') + '/' + level.uri;
        } else {
          level.fullUrl = '\n' + this.masterManifestUrl.split('/').slice(0, 3).join('/') + level.uri;
        }
        return fetch(level.fullUrl.trim(), this.viewerState.xhrCredentials ? { credentials: 'include' } : {})
          .then((response) => {
            return response.text();
          })
          .then((manifestStr) => this.parseLevelManifest(manifestStr, level));
      })
    );
  };

  private lastFrag = (manifest: string): string[] => {
    const lastFragArray: string[] = [];
    const newLine = manifest.split('\n');
    const lineSlice = newLine.slice(-300);
    const result = lineSlice.filter((newlineSlice) => newlineSlice.match(LAST_FRAGMENT_REGEX));
    let i;
    for (i = 0; i < result.length; i++) {
      const currentLine = result[i];
      if (result && lastFragArray.indexOf(currentLine) < 0) {
        lastFragArray.push(currentLine);
      }
    }
    return lastFragArray;
  };

  private parseLevelManifest = (manifestStr: string, level: ManifestLevel) => {
    level.lastFrag = manifestStr
      .split('\n')
      .slice(-3)
      .find((line) => !!(line && line.indexOf('#') === -1));
    level.isLive = manifestStr.indexOf('#EXT-X-ENDLIST') === -1;

    if (level.lastFrag === level.lastFragNumber) {
      level.lastFragSeenCount!++;
    } else {
      level.lastFragSeenCount = 0;
    }

    // NOTE (william@realeyes.com October 1, 2020) This code was commented out when fixing stall detector issue (MM-600)
    // We were having issues parsing correct fragment numbers out of strings for different manifests. This was causing issues so
    // we switched to string comparison to determine stall detection which resulted in us having to remove this logic for rollback
    // which depended on fragment number. If we determine purpose of rollback or plan to keep it we need to find a better route to
    // fix rollback that will be dynamic enough to handle all manifests with varying fragment uri's

    // if (level.lastFragNumber && lastFragNumber < level.lastFragNumber) {
    //   console.log(
    //     `Rollback detected on ${JSON.stringify(level)} from fragment ${
    //       level.lastFragNumber
    //     } to ${lastFragNumber} at ${new Date().toUTCString()}`
    //   );
    //   level.isRollback = true;
    //   level.prevFragNumber = level.lastFragNumber;
    // } else if (level.lastFragNumber && lastFragNumber > level.lastFragNumber && level.isRollback) {
    //   level.isRollback = false;
    //   console.log(
    //     `Rollback recovered on ${JSON.stringify(level)} from fragment ${
    //       level.lastFragNumber
    //     } to ${lastFragNumber} at ${new Date().toUTCString()}`
    //   );
    // }
    level.lastFragNumber = level.lastFrag;
  };

  private detectStall = () => {
    this.manifestLevels.forEach((level) => {
      if (level.lastFragSeenCount) {
        if (level.lastFragNumber === '') {
          level.status = '✖ failed to load';
          level.isStall = false;
        } else if (!level.isLive) {
          level.status = 'REPLAY';
          level.isStall = false;
        } else if (level.lastFragSeenCount >= this.stallThreshold) {
          level.status = '✖ STALL';
          if (!this.isAlarmPlaying && !level.isStall) {
            this.isAlarmPlaying = true;
            if (this.alarmElement) {
              this.alarmElement.play();
            }
            level.isStall = true;
            console.log(`Stall detected on ${JSON.stringify(level)} at ${new Date().toUTCString()}`);
          }

          level.isStall = true;
        } else if (level.isRollback) {
          level.status = '✖ ROLLBACK';
        } else {
          if (level.isStall) {
            // recovering
            level.status = '✔';
            level.isStall = false;
            console.log(`Stall recovered on ${JSON.stringify(level)} at ${new Date().toUTCString()}`);
          }

          level.status = '✔';
          level.isStall = false;
        }
      }
    });

    let stallStatus: StallDetectorStatuses = 'pass';

    if (
      this.manifestLevels.reduce((acc, current) => {
        if (current.status !== 'REPLAY') {
          acc = false;
        }
        return acc;
      }, true)
    ) {
      stallStatus = 'replay';
      this.stopPolling();
    } else {
      const rollbackCheck = this.checkAvailability(this.manifestLevels, 'rollback');
      const stallCheck = this.checkAvailability(this.manifestLevels, 'stall');
      if (rollbackCheck) {
        stallStatus = 'rollback';
      }

      if (stallCheck) {
        stallStatus = 'stall';
      }
    }
    this.viewerState.stallDetectorStatus = stallStatus;
  };

  private startPolling = () => {
    this.levelPollingInterval = setInterval(this.poll, this.pollInterval);
  };

  private stopPolling = () => {
    if (this.levelPollingInterval) {
      clearInterval(this.levelPollingInterval);
      this.levelPollingInterval = null;
    }
  };

  public onAudioEnd = () => {
    this.isAlarmPlaying = false;
  };

  public checkAvailability = (manifestLevels: ManifestLevel[], val: string) => {
    return manifestLevels.some((arrVal) => {
      if (val === 'rollback') {
        return !!arrVal.isRollback;
      } else if (val === 'stall') {
        return !!arrVal.isStall;
      }
      return false;
    });
  };

  public toggleMasterUrl = (): void => {
    this.showMasterUrl = !this.showMasterUrl;
    if (!this.showMasterUrl) {
      this.urlText = 'Show Master Url';
    } else {
      this.urlText = 'Hide Master Url';
    }
  };

  public getStallThreshold = () => {
    if (!localStorage.getItem('stallThreshold')) {
      this.stallThreshold = 3;
    } else {
      this.stallThreshold = Number(localStorage.getItem('stallThreshold'));
    }
  };

  public saveStallThreshold = (input: string): void => {
    if (input && !isNaN(Number(input))) {
      localStorage.setItem('stallThreshold', input);
    }
    this.stopPolling();
  };

  public getPollInterval = () => {
    if (!localStorage.getItem('pollInterval')) {
      this.pollInterval = 6000;
    } else {
      this.pollInterval = Number(localStorage.getItem('pollInterval'));
    }
  };

  public savePollInterval = (input: string): void => {
    if (input && !isNaN(Number(input))) {
      localStorage.setItem('pollInterval', input);
    }
    this.stopPolling();
  };
}
