import { Component, OnInit, Input, EventEmitter, Output, OnDestroy, OnChanges } from '@angular/core';
import { ViewerState, ParsedManifest, UserAgentUtil, Metric, DataService, ParserService, VideoPlayers } from '../../shared';
import { BehaviorSubject, interval, Subject } from 'rxjs';
import { sample, takeUntil } from 'rxjs/operators';
import { ChartEvent, ChartType } from 'ng-chartist';
import { DownloadDataManager, DownloadTime, TimeDataSeries } from '../../shared/services/download-data-manager.service';
import { IChartistData, ChartistStatic } from 'chartist';

declare var Chartist: ChartistStatic;
export interface AlignmentMessage {
  message: string;
  url: string;
}

export interface Chart {
  type: ChartType;
  data: IChartistData;
  options?: any;
  responsiveOptions?: any;
  events?: ChartEvent;
}

interface ChartObject {
  [viewerStateId: string]: Chart;
}

@Component({
  selector: 'app-data',
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.scss'],
})
export class DataComponent implements OnInit, OnChanges, OnDestroy {
  @Input() public viewerState: ViewerState;
  @Input() public manifestUpdate$: BehaviorSubject<ParsedManifest>;
  @Input() public isOnlyViewer = false;
  @Input() public id: string;
  @Input() public type: 'hls' | 'dash' | 'unknown';
  @Input() public selectedPlayer: 'hls' | 'dash' | 'shaka';
  @Output() public seek = new EventEmitter<Metric>();
  @Output() public loadLevelRequest = new EventEmitter<string>();

  public currentTime = -1;
  public codecs: string;
  public discontinuities: Metric[] | null;
  public ads: Metric[] | null;
  public segmentCount: number | undefined;
  public showHlsErrors = false;
  public showAds = false;
  public showDis = false;
  public showPdt = false;
  public pdt: Metric[] | null;
  public abs: number;
  public videoDuration: number;
  public manifestDuration: number | undefined;
  public selectedAd: Metric;
  public selectedPdt: Metric;
  public selectedDiscontinuity: Metric;
  public selectedVideoError: Metric;
  public selectedFragDuration: Metric;

  public CODECS_MATCH: RegExp = /(CODECS)+="(.*?)"/g;

  public levelAlignmentStatus: string;
  public levelAlignmentMessages: AlignmentMessage[];
  public levelUrls: string[];

  public chart: ChartObject = {};
  public dataToRender: DownloadTime[];
  public fragIndex = 0;
  public showGraph: boolean;

  public VideoPlayers = VideoPlayers;

  private ngUnsubscribe: Subject<void> = new Subject<void>();
  private downloadUnsubscribe: Subject<void> = new Subject<void>();

  constructor(private dataService: DataService, private parserService: ParserService, private downloadManager: DownloadDataManager) {}

  public ngOnInit() {
    this.addObservers();
  }

  public ngOnChanges() {
    if (this.showGraph === false) {
      this.downloadUnsubscribe.next();
    }
  }

  public ngOnDestroy() {
    delete this.chart[this.viewerState.id];
    this.downloadManager.cleanData(this.viewerState.id);
    this.ngUnsubscribe.next();
    this.downloadUnsubscribe.next();
  }

  public addObservers = () => {
    this.viewerState.currentDisplayTime$.pipe(sample(interval(250)), takeUntil(this.ngUnsubscribe)).subscribe(this.onTimeUpdate);
    this.manifestUpdate$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onManifestUpdate);
    this.downloadManager
      .getDataToRender()
      .pipe(takeUntil(this.downloadUnsubscribe))
      .subscribe((allFragments) => {
        if (this.viewerState && this.viewerState.url && this.viewerState.id) {
          let chartSeries: number[] | number[][] = [];
          let chartLabels: number[] | string[] = [];
          const viewerStateFragments = allFragments[this.viewerState.id] || [];
          const bitrateIndexList = Object.keys(viewerStateFragments).map(Number);
          const minBitrateIndex = Math.min(...bitrateIndexList);
          const maxBitrateIndex = Math.max(...bitrateIndexList);
          const minSegmentNumber = this.getMinSegmentNumber(viewerStateFragments);
          const preparedViewerStateFragmentData: DownloadTime = this.prepareViewerStateFragments(
            viewerStateFragments,
            minSegmentNumber,
            minBitrateIndex,
            maxBitrateIndex
          );
          const sortedViewerStateFragments: DownloadTime = {};
          for (const key in preparedViewerStateFragmentData) {
            const normalizedKey = Number(key) + 1;
            sortedViewerStateFragments[normalizedKey] = preparedViewerStateFragmentData[key];
          }
          chartSeries = Object.values(sortedViewerStateFragments).map((data: number) => {
            return Object.values(data);
          });
          const maxSegmentNumberOFViewerStateFragments = this.getMaxSegmentNumber(viewerStateFragments);
          const chartLabelLength = maxSegmentNumberOFViewerStateFragments - minSegmentNumber;
          chartLabels = Array.from({ length: chartLabelLength + 1 }, (_, i) => minSegmentNumber + i);

          const chartData = {
            series: chartSeries,
            labels: chartLabels,
          };
          this.createChartData(chartData);
        }
      });
  };

  private getMinSegmentNumber = (viewerStateFragments: DownloadTime) => {
    return Math.min(
      ...Object.keys(viewerStateFragments).map((bitrateIndex) => Math.min(...Object.keys(viewerStateFragments[bitrateIndex]).map(Number)))
    );
  };

  private getMaxSegmentNumber = (viewerStateFragments: DownloadTime) => {
    return Math.max(
      ...Object.keys(viewerStateFragments).map((bitrateIndex) => Math.max(...Object.keys(viewerStateFragments[bitrateIndex]).map(Number)))
    );
  };

  private prepareViewerStateFragments = (
    viewerStateFragments: DownloadTime,
    minSegmentNumber: number,
    minBitrateIndex: number,
    maxBitrateIndex: number
  ) => {
    let updatedViewerStateFragment: DownloadTime = [];
    for (let bitrateIndex = minBitrateIndex; bitrateIndex <= maxBitrateIndex; bitrateIndex++) {
      if (viewerStateFragments[bitrateIndex]) {
        const segmentNumberDownloadTimesMap = viewerStateFragments[bitrateIndex];
        const segmentNumberList = Object.keys(segmentNumberDownloadTimesMap);
        const numberOfFragments = Math.max(...segmentNumberList.map((k) => Number(k))) - minSegmentNumber;
        updatedViewerStateFragment[bitrateIndex] = {};
        for (let i = 0; i <= numberOfFragments; i++) {
          const segmentNumber = i + minSegmentNumber;
          if (segmentNumberDownloadTimesMap[segmentNumber]) {
            updatedViewerStateFragment[bitrateIndex][i] = {
              name: `level${bitrateIndex}`,
              meta: `Level: ${bitrateIndex} | Sn: ${segmentNumber} | Type: ${segmentNumberDownloadTimesMap[segmentNumber].segmentType}`,
              value: segmentNumberDownloadTimesMap[segmentNumber].downloadTime,
            };
          } else {
            updatedViewerStateFragment[bitrateIndex][i] = null;
          }
        }
      } else {
        updatedViewerStateFragment[bitrateIndex] = [];
      }
    }
    return updatedViewerStateFragment;
  };

  public onManifestUpdate = (manifest: ParsedManifest) => {
    if (manifest) {
      if (manifest.info.levelUrls) {
        this.levelUrls = manifest.info.levelUrls;
        this.levelAlignmentStatus = 'Ready';
        this.levelAlignmentMessages = [];
      }
      this.discontinuities = manifest.info.discontinuities || null;
      this.ads = manifest.info.ads || null;
      this.segmentCount = manifest.info.segmentUrls && manifest.info.segmentUrls.length;
      this.pdt = manifest.info.pdt || null;
      this.manifestDuration = manifest.info.duration;
    } else {
      this.levelAlignmentStatus = '';
      this.levelAlignmentMessages = [];
      this.levelUrls = [];
    }
  };

  public seekToObj = (obj: Metric) => {
    this.seek.emit(obj);
  };

  public onTimeUpdate = (time: number) => {
    this.currentTime = time;
    if (this.pdt) {
      const lastPdt = this.pdt[this.pdt.length - 1];
      const convertPdt = Number(lastPdt.displayText);
      this.abs = convertPdt + this.currentTime;
    }
  };

  public setErrorVis = (val: boolean) => {
    this.showHlsErrors = val;
    return true;
  };

  public setAdsVis = (val: boolean) => {
    this.showAds = val;
    return true;
  };

  public setDisVis = (val: boolean) => {
    this.showDis = val;
    return true;
  };

  public setPdtVis = (val: boolean) => {
    this.showPdt = val;
    return true;
  };

  public onAdSelect = (metric: Metric) => {
    this.selectedAd = metric;
    this.seekToObj(metric);
  };

  public onPdtSelect = (metric: Metric) => {
    this.selectedPdt = metric;
    this.seekToObj(metric);
  };

  public onDiscontinuitiesSelect = (metric: Metric) => {
    this.selectedDiscontinuity = metric;
    this.seekToObj(metric);
  };

  public onVideoErrorSelect = (metric: Metric) => {
    this.selectedVideoError = metric;
    this.seekToObj(metric);
  };

  public onFragDurationSelect = (metric: Metric) => {
    this.selectedFragDuration = metric;
    this.seekToObj(metric);
  };

  public droppedFramesFunction = () => {
    if (UserAgentUtil.is.chrome || UserAgentUtil.is.safari) {
      return this.viewerState.droppedFrames;
    } else {
      return 'N/A';
    }
  };

  public loadLevel = (levelUrl: string) => {
    this.loadLevelRequest.emit(levelUrl);
  };

  public startAlignmentCheck = () => {
    if (this.levelAlignmentStatus === 'Ready') {
      this.levelAlignmentStatus = 'loading levels...';
      Promise.all(
        this.levelUrls.map((eachUrl) => {
          return this.dataService.getManifest(eachUrl).then(this.parserService.parseManifest);
        })
      )
        .then((allParsedManifests) => {
          this.levelAlignmentMessages = this.findMisalignments(allParsedManifests);
          this.levelAlignmentStatus = this.levelAlignmentMessages.length ? 'Mismatched Levels:' : 'Aligned';
        })
        .catch((error) => {
          this.levelAlignmentMessages = [{ message: `error loading level ${error.url}`, url: error.url }];
        });
    }
  };

  private findMisalignments = (levels: ParsedManifest[]): AlignmentMessage[] => {
    const messages: (AlignmentMessage | never)[] = [];
    const firstLevel = levels[0];
    const segmentCount = firstLevel.info.segmentUrls && firstLevel.info.segmentUrls.length;
    const discontinuityCount = (firstLevel.info.discontinuities && firstLevel.info.discontinuities.length) || 0;
    const pdtCount = (firstLevel.info.pdt && firstLevel.info.pdt.length) || 0;
    const adCount = (firstLevel.info.ads && firstLevel.info.ads.length) || 0;
    for (let i = 1; i < levels.length; i++) {
      const levelChecked = levels[i];
      const discontinuityCountOfChecked = (levelChecked.info.discontinuities && levelChecked.info.discontinuities.length) || 0;
      if (discontinuityCountOfChecked !== discontinuityCount) {
        messages.push({ message: `discontinuityCount mismatch on level ${i + 1}/${levels.length}`, url: levels[i].url });
      }
      const pdtCountOfChecked = (levelChecked.info.pdt && levelChecked.info.pdt.length) || 0;
      if (pdtCountOfChecked !== pdtCount) {
        messages.push({ message: `pdtCount mismatch on level ${i + 1}/${levels.length}`, url: levels[i].url });
      }
      const adCountOfChecked = (levelChecked.info.ads && levelChecked.info.ads.length) || 0;
      if (adCountOfChecked !== adCount) {
        messages.push({ message: `adCount mismatch on level ${i + 1}/${levels.length}`, url: levels[i].url });
      }
      const segmentCountOfChecked = levelChecked.info.segmentUrls && levelChecked.info.segmentUrls.length;
      if (segmentCountOfChecked !== segmentCount) {
        messages.push({ message: `segmentCount mismatch on level ${i + 1}/${levels.length}`, url: levels[i].url });
      }
    }
    return messages;
  };

  private createChartData(data) {
    let divider = Math.round(data.labels.length / 10);
    this.chart[this.viewerState.id] = {
      type: 'Line',
      data: data,
      options: {
        low: 0,
        showArea: true,
        showLine: true,
        showGrid: true,
        showPoint: true,
        fullWidth: true,
        axisX: {
          labelInterpolationFnc: function (value, index) {
            return index % divider === 0 ? value : null;
          },
        },
        plugins: [
          Chartist.plugins.tooltip({
            appendToBody: true,
          }),
          Chartist.plugins.ctAxisTitle({
            axisX: {
              axisTitle: 'Segment Number',
              axisClass: 'ct-axis-title ct-axis-x-title',
              offset: {
                x: 0,
                y: 30,
              },
              textAnchor: 'middle',
            },
            axisY: {
              axisTitle: 'Time (ms)',
              axisClass: 'ct-axis-title ct-axis-y-title',
              offset: {
                x: 0,
                y: 0,
              },
              textAnchor: 'middle',
              flipTitle: false,
            },
          }),
        ],
      },
    };
  }
}
