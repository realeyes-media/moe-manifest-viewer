import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DrmInfoType {
  drmLicenseUrl: string;
  drmType: DRMType;
  viewerStateId: string;
  headerName?: string;
  headerValue?: string;
}

export enum DRMType {
  NONE = 'NONE',
  WIDEVINE = 'WIDEVINE',
  PLAYREADY = 'PLAYREADY',
  FAIRPLAY = 'FAIRPLAY',
  CLEAR_KEY = 'CLEAR_KEY',
}

export enum DRMServerId {
  NONE = '',
  WIDEVINE = 'com.widevine.alpha',
  PLAYREADY = 'com.microsoft.playready',
  FAIRPLAY = 'com.apple.fps.1_0',
  CLEAR_KEY = 'org.w3.clearkey',
}

export const getDrmServerId = (type: DRMType): DRMServerId => {
  switch (type) {
    case DRMType.WIDEVINE:
      return DRMServerId.WIDEVINE;
    case DRMType.PLAYREADY:
      return DRMServerId.PLAYREADY;
    case DRMType.FAIRPLAY:
      return DRMServerId.FAIRPLAY;
    case DRMType.CLEAR_KEY:
      return DRMServerId.CLEAR_KEY;
    default:
      return DRMServerId.NONE;
  }
};

@Injectable({ providedIn: 'root' })
export class DrmManagerService {
  private allDrmInfo: DrmInfoType | {} = {};
  public drmInfo$ = new BehaviorSubject<DrmInfoType | {}>({});

  constructor() {}

  public getCurrentDrmInfo(id: string): DrmInfoType {
    return this.allDrmInfo[id];
  }

  public setCurrentDrmInfo(id: string, info: DrmInfoType): void {
    this.allDrmInfo[id] = info;
    this.drmInfo$.next(info);
  }
}
