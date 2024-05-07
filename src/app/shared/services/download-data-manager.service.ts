import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { Injectable } from '@angular/core';
import { ParserService } from './parser.service';
import { safeURL } from '../utils/safe-url.util';

export interface TimeDataSeries {
  bitrateIndex?: number;
  segmentNumber?: number;
  segmentType?: string;
  downloadTime: number;
}
export interface DownloadTime {
  [key: number]: Record<number, any>;
}

export interface DownloadData {
  asset: string;
  currentUrl: string;
  data: {
    label: number;
    series: TimeDataSeries;
  };
  viewerStateId: string;
}

export interface ViewerStateWithDownloadTime {
  [viewerStateId: string]: DownloadTime;
}

@Injectable()
export class DownloadDataManager {
  public downloadData$: Subject<DownloadData> = new Subject<DownloadData>();
  public dataToRender$: BehaviorSubject<ViewerStateWithDownloadTime> = new BehaviorSubject<ViewerStateWithDownloadTime>({});
  public numDataPointsToShow: 10;
  private viewerStateWithGraph: ViewerStateWithDownloadTime = {};

  public constructor(private parserService: ParserService) {
    this.getDownloadData().subscribe((data) => this.getData(data));
  }

  private getData(fragment: DownloadData) {
    const url = safeURL(fragment.asset);
    if (url.valid) {
      let downloadTimes: DownloadTime = this.viewerStateWithGraph[fragment.viewerStateId] || [];
      if (fragment.data.series.bitrateIndex !== undefined && fragment.data.series.segmentNumber !== undefined) {
        if (!(fragment.data.series.bitrateIndex in downloadTimes)) {
          downloadTimes = {
            ...downloadTimes,
            [fragment.data.series.bitrateIndex]: {},
          };
        }
        downloadTimes[fragment.data.series.bitrateIndex][fragment.data.series.segmentNumber] = {
          segmentType: fragment.data.series.segmentType,
          downloadTime: Math.round(fragment.data.series.downloadTime),
        };
        this.viewerStateWithGraph[fragment.viewerStateId || ''] = downloadTimes;
        this.setDataToRender({ ...this.viewerStateWithGraph });
      }
    }
  }

  public getDownloadData(): Observable<DownloadData> {
    return this.downloadData$.asObservable();
  }

  public setDownloadData(data: DownloadData): void {
    this.downloadData$.next(data);
  }

  public setDataToRender(data: ViewerStateWithDownloadTime) {
    this.dataToRender$.next(data);
  }

  public getDataToRender() {
    return this.dataToRender$;
  }

  public cleanData(viewerStateId: string) {
    if (viewerStateId) {
      delete this.viewerStateWithGraph[viewerStateId];
    }
  }
}
