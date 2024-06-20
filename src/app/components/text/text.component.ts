import { Component, OnInit, Input, Output, EventEmitter, ViewChild, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { VirtualScrollComponent } from '../../shared/utils/virtual-scroll';
import {
  ManifestLineObject,
  ViewerState,
  DashSegment,
  CopyService,
  KeyboardService,
  ScrollTypes,
  SegmentInspector,
  ParserService,
  AppService,
  VideoPlayers,
} from '../../shared';
import { takeUntil } from 'rxjs/operators';
import { SCTE35 } from 'scte35';
import * as download from 'downloadjs';
import { SCTE35Data } from '../../shared/models/sctce35Types';
import { TabObjectName } from 'src/app/shared/models/tabs.model';

@Component({
  selector: 'app-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.scss'],
})
export class TextComponent implements OnInit, OnDestroy {
  @Output() public setScrolling: EventEmitter<ScrollTypes> = new EventEmitter();
  @Output() public showVideoEmitter: EventEmitter<boolean> = new EventEmitter();
  @Output() public clearManifestRequest: EventEmitter<void> = new EventEmitter();
  @Output() public newViewerRequest: EventEmitter<string> = new EventEmitter();
  @Output() public urlUpdate: EventEmitter<{ url: string; bandwidth?: number }> = new EventEmitter();
  @Output() public onToggleSegmentInspector = new EventEmitter<SegmentInspector>();

  @Input() public viewerState: ViewerState;
  @Input() public type: string;
  @Input() public isSetManifest: boolean;
  @Input() public useNative: boolean;
  @Input() public activeSearchTerm: string;
  @Input() public manifest$: BehaviorSubject<ManifestLineObject[]>;
  @Input() public segments$: BehaviorSubject<DashSegment[]>;
  @Input() public subtitles$: BehaviorSubject<string[]>;
  @Input() public scrollInto$: Subject<ManifestLineObject | DashSegment | string>;
  @Input() public levels: Hls.Level[];
  @Input() public manifestView: string;

  @ViewChild(VirtualScrollComponent, { static: false }) private virtualScroll: VirtualScrollComponent;

  private ngUnsubscribe: Subject<void> = new Subject<void>();
  private currentUrlFragment: string;

  public viewPortItems: any[] = [];
  public VideoPlayers = VideoPlayers;

  constructor(
    private copyService: CopyService,
    private keyboardService: KeyboardService,
    private parserService: ParserService,
    private appService: AppService
  ) {}

  public ngOnInit() {
    this.addListeners();
  }

  public ngOnDestroy() {
    this.ngUnsubscribe.next();
  }

  public addListeners = () => {
    this.scrollInto$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.scrollInto);
    this.manifest$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onNewFragLoad);
    this.segments$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onNewFragLoad);
    this.subtitles$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onNewFragLoad);
  };

  public onMouseWheel = (event: Event) => {
    this.appService.setScrolling({ viewerStateId: this.viewerState.id, currentScoll: ScrollTypes.NONE });
  };

  public onNewFragLoad = (event) => {
    const scrollDiv = document.getElementById('vscroll');
    if (scrollDiv) {
      const pos = scrollDiv.scrollTop + scrollDiv.clientHeight;
      const max = scrollDiv.scrollHeight;
      const currentViewerScoll = this.appService.currentScroll[this.viewerState.id];
      if (
        pos === max &&
        this.parserService?.streamInfo?.level === 'stream' &&
        this.parserService?.streamInfo?.type === 'live' &&
        currentViewerScoll &&
        currentViewerScoll.currentScoll !== ScrollTypes.AUTO_SCROLL
      ) {
        this.appService.setScrolling({ viewerStateId: this.viewerState.id, currentScoll: ScrollTypes.TAIL_MANIFEST });
      }
    }
  };

  public scrollInto = (lineObject: DashSegment | ManifestLineObject) => {
    this.virtualScroll.scrollInto(lineObject);
  };

  public onSegmentUrlClick = (startTime: number) => {
    this.viewerState.updateTime(startTime);
  };

  public updatePlayerTime(time: number): void {
    this.showVideoEmitter.next(true);
    this.viewerState.updateTime(time);
  }

  public onLineClick = (line: ManifestLineObject, $event: MouseEvent) => {
    // check if text is highlighted
    if (!window?.getSelection()?.isCollapsed) {
      return;
    }
    const { startTime } = line;
    const { cntrlActive, shiftActive } = this.keyboardService;
    const lineUrl: string = String(line.url || line.attributes?.URI || '');
    const urlVtt = lineUrl.includes('.webvtt') || lineUrl.includes('.vtt');
    if (line.scteData !== undefined) {
      this.onScteClick(line.scteData);
      return;
    }
    if (typeof startTime === 'number' && !shiftActive && !urlVtt) {
      this.updatePlayerTime(startTime);
      return;
    }
    if (!lineUrl) {
      return;
    }
    if (this.isNotManifestFile(lineUrl)) {
      window.open(lineUrl, '_blank');
      return;
    }
    if (!cntrlActive && !shiftActive) {
      this.clearManifestRequest.next();
      if (this.levels && this.levels.some((level) => lineUrl.includes(level.url[0]))) {
        const levelIndex = this.levels.findIndex((level) => lineUrl.includes(level.url[0]));
        this.urlUpdate.next({ url: lineUrl, bandwidth: this.levels[levelIndex].bitrate });
      } else {
        this.urlUpdate.next({ url: lineUrl });
      }
    }
    if (cntrlActive) {
      this.newViewerRequest.next(lineUrl);
    }
    if (shiftActive) {
      this.downloadAndCopyFrag(lineUrl, $event);
    }
  };

  public onVirtualScrollUpdate = (event) => {
    this.viewPortItems = event;
    // if syncScteData is enabled and current fragment has scteData
    // Synchronize SCTE Data with Play Back
    const currentScte = event.find((e) => e.highlight === true && e.scteData);
    if (currentScte && this.viewerState.syncScteData) {
      this.onScteClick(currentScte.scteData);
    }
  };

  public downloadAndCopyFrag(url: string, $event: MouseEvent): void {
    $event.preventDefault();
    this.copyService.copyText(url);
    download(url);
  }

  public inspectFragment(toggled: boolean, url: string) {
    this.viewerState.updateActiveTab('Segment Inspector', !toggled);
    if (url !== this.currentUrlFragment) {
      this.currentUrlFragment = url;
      this.onToggleSegmentInspector.emit({ show: true, url });
    } else {
      this.onToggleSegmentInspector.emit({ show: !toggled, url: toggled ? '' : url });
    }
  }

  private scteValue(name: string, value) {
    return value !== undefined ? value : ``;
  }

  private onScteClick = (scte: SCTE35Data) => {
    const scte35 = new SCTE35();
    let result;
    let parsedData;
    if (scte.data) {
      result = scte35.parseFromB64(`${scte.data}`);
      parsedData = JSON.stringify(result);
    }
    if (scte.scte35Cmd || scte.scte35Out) {
      const data = scte.scte35Out ?? scte.scte35Cmd;
      if (data) {
        result = scte35.parseFromHex(data);
        parsedData = JSON.stringify(result);
      }
    }
    const logData = {
      data: this.scteValue('data', parsedData),
      blackout: this.scteValue('type', scte.type),
      duration: this.scteValue('duration', scte.duration),
      elapsed: this.scteValue('elapsed', scte.elapsed),
      id: this.scteValue('id', scte.id),
      segne: this.scteValue('segne', scte.segne),
      time: this.scteValue('time', scte.time),
      type: this.scteValue('type', scte.type),
      upid: this.scteValue('upid', scte.upid),
      startDate: this.scteValue('startDate', scte.startDate),
      endDate: this.scteValue('endDate', scte.endDate),
      plannedDuration: this.scteValue('plannedDuration', scte.plannedDuration),
    };

    if (scte.xProgramTimePosition || scte.xAssetId || scte.xSlotId) {
      logData['xProgramTimePosition'] = this.scteValue('xProgramTimePosition', scte.xProgramTimePosition);
      logData['xAssetId'] = this.scteValue('xAssetId', scte.xAssetId);
      logData['xSlotId'] = this.scteValue('xSlotId', scte.xSlotId);
    }
    if (!this.viewerState.showScteDisplay) {
      this.viewerState.setOption('showScteDisplay', true);
      this.viewerState.updateActiveTab(TabObjectName.SCTEDISPLAY, true);
    }
    this.viewerState.setScteDisplayData(logData);
  };

  private isNotManifestFile(lineUrl: string): boolean {
    const extensions = ['.m3u8', '.m3u', '.webvtt', '.vtt', '.ts', '.mp4', '.ttml', '.mpd'];
    let isManifestFile = false;
    extensions.forEach((extension) => {
      if (lineUrl.includes(extension)) {
        isManifestFile = true;
      }
    });
    return !isManifestFile;
  }
}
