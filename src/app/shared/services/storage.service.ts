import { Injectable } from '@angular/core';
import { ViewerOptionTypes, StoredViewer } from '..';
import { BehaviorSubject } from 'rxjs';
import { VideoPlayers } from '../models/video-players';
@Injectable()
export class StorageService {
  private localStorageKey = 'MV_VIEWERS';
  private cookieToken = 'globalToken=';
  private playerKey = 'MV_PLAYER_SELECTOR';

  public storedViewers$ = new BehaviorSubject<StoredViewer[]>([]);

  constructor() {
    this.setInitialStoredViewers();
  }

  public saveViewer = (id: string, url: string, options: ViewerOptionTypes): Promise<void> => {
    const newViewer: StoredViewer = {
      id: id,
      url: url,
      options: options,
      timeStamp: new Date().getTime(),
    };
    return this.storeInLocalStorage(newViewer);
  };

  private storeInLocalStorage(obj: StoredViewer): Promise<void> {
    const storageResults = localStorage.getItem(this.localStorageKey) || '[]';
    let storedViewers: StoredViewer[] = [];
    return new Promise((resolve, reject) => {
      if (!obj.url) {
        reject();
      } else {
        try {
          storedViewers = JSON.parse(storageResults);
          if (storedViewers.find((viewer) => viewer.id === obj.id)) {
            storedViewers = storedViewers.filter((viewer) => {
              return viewer.id !== obj.id;
            });
          }
          storedViewers.push(obj);
          this.setArrayInLocalStorage(storedViewers);
          this.storedViewers$.next(this.sortViewers(storedViewers));
          resolve();
        } catch (e) {
          console.log('error parsing stored viewers, setting to []');
          this.clearStorage();
          reject();
        }
      }
    });
  }

  public updateStoredViewerId = (prevId, curId) => {
    try {
      let viewers = JSON.parse(localStorage.getItem(this.localStorageKey) || '');
      viewers = viewers.map((eachViewer) => {
        if (eachViewer.id === prevId) {
          eachViewer.id = curId;
        }
        return eachViewer;
      });
      this.setArrayInLocalStorage(viewers);
    } catch (e) {
      console.log('failed to update viewer id');
    }
  };

  public updateViewerTimestamp = (viewer: StoredViewer) => {
    try {
      let viewers = JSON.parse(localStorage.getItem(this.localStorageKey) || '');
      viewers = viewers.map((eachViewer: StoredViewer) => {
        if (eachViewer.id === viewer.id) {
          eachViewer.timeStamp = new Date().getTime();
        }
        return eachViewer;
      });
      this.setArrayInLocalStorage(viewers);
      this.storedViewers$.next(this.sortViewers(viewers));
    } catch (e) {
      console.log('failed to update timestamp', e);
    }
  };

  private setArrayInLocalStorage = (data: StoredViewer[]) => {
    localStorage.setItem(this.localStorageKey, JSON.stringify(data));
  };

  public setGlobalTokenCookie(globalToken: string): void {
    document.cookie = this.cookieToken + globalToken;
  }

  public deleteGlobalTokenCookie(globalToken: string): void {
    document.cookie = this.cookieToken + '; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  }

  public setInitialStoredViewers = (): void => {
    let viewers = [];
    try {
      viewers = JSON.parse(localStorage.getItem(this.localStorageKey) || '') || [];
    } catch (e) {
      console.log('error getting stored viewers, clearing storage');
      this.clearStorage();
    }
    this.storedViewers$.next(this.sortViewers(viewers));
  };

  public getGlobalToken = (): string => {
    const result: RegExpMatchArray | null = /(.+)?globalToken=(.+)/.exec(document.cookie);
    if (result && result[2] && result[2].split(';')) {
      return result[2].split(';')[0];
    }
    return '';
  };

  public clearStorage = () => {
    localStorage.removeItem(this.localStorageKey);
    this.storedViewers$.next([]);
  };

  public removeViewer = (viewerToRemove: StoredViewer) => {
    let viewers: StoredViewer[] = [];
    try {
      viewers = JSON.parse(localStorage.getItem(this.localStorageKey) || '') || [];
      viewers = viewers.filter((viewer) => {
        return viewer.id !== viewerToRemove.id;
      });
      this.setArrayInLocalStorage(viewers);
    } catch (e) {
      console.log('error getting stored viewers, clearing storage');
      this.clearStorage();
    }
    this.storedViewers$.next(this.sortViewers(viewers));
  };

  public sortViewers = (viewers: StoredViewer[]): StoredViewer[] => {
    return viewers.sort((a: StoredViewer, b: StoredViewer) => {
      return a.timeStamp < b.timeStamp ? 1 : -1;
    });
  };

  public saveSelectedPlayer = (value: VideoPlayers) => {
    localStorage.setItem(this.playerKey, value);
  };

  public getSelectedPlayer = (): VideoPlayers => {
    return <VideoPlayers>localStorage.getItem(this.playerKey);
  };
}
