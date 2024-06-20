import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { AppService, KeyboardService, ViewerState, Viewer, ViewerOptionTypes, DefaultViewerName, AddViewerOptions } from '../../shared';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-wrapper',
  templateUrl: 'wrapper.component.html',
  styleUrls: ['wrapper.component.scss'],
})
export class WrapperComponent implements OnInit, OnDestroy {
  @Input() public showOptionsModal;
  @Input() public viewerState: ViewerState;

  public viewers: Viewer[] = [];
  public viewerWidthsMap: number[] = [];
  public lastClosedViewers: Viewer[] = [];

  private idLength = 20;
  private ngUnsubscribe: Subject<void> = new Subject<void>();
  private minViewerWidth = 295;

  constructor(private appService: AppService, private keyboardService: KeyboardService) {}

  public ngOnInit() {
    const id = this.generateId(this.idLength);
    const options: ViewerOptionTypes = {
      name: DefaultViewerName,
      showVideo: false,
      muteVideo: false,
      useNative: false,
      showHelp: false,
      xhrCredentials: false,
      globalTokenActive: false,
      showMetrics: false,
      showCMCD: false,
      showPlayerConfig: false,
      segmentInspector: { show: false },
      showScteDisplay: false,
      showStallDetector: false,
      showPlayerLogs: false,
      showSubtitles: false,
    };
    this.addViewer({ url: '', options: options }, -1);
    this.subscribeToCommands();
  }

  public ngOnDestroy() {
    this.ngUnsubscribe.next();
    window.removeEventListener('resize', this.checkMinWidths);
  }

  public addViewer = (
    { url, options, id = this.generateId(this.idLength), onCreate = () => undefined }: AddViewerOptions,
    index: number
  ) => {
    const viewerWithIdPresent = this.viewers.some((viewer) => viewer.id === id);
    const newViewer: Viewer = {
      id: viewerWithIdPresent ? this.generateId(this.idLength) : id,
      url,
      viewerState: new ViewerState(id, options),
    };
    onCreate(newViewer);
    this.viewers.splice(index + 1, 0, newViewer);
    this.viewerWidthsMap.splice(index + 1, 0, 100 / (this.viewers.length - 1 || 1)); // width
    this.fillPlayerWidths();
  };

  public onCloseRequest = (id: string) => {
    this.viewers = this.viewers.filter((viewer, i) => {
      if (viewer.id !== id) {
        return true;
      }
      this.lastClosedViewers.push(viewer);
      this.viewerWidthsMap.splice(i, 1);
      return false;
    });
    this.fillPlayerWidths();
  };

  public onIdChangeRequest = ({ prevId, curId }) => {
    if (curId === '_generateNewId_') {
      curId = this.generateId(this.idLength);
    }
    if (this.viewers.find((viewer) => viewer.id === curId)) {
      curId = this.generateId(this.idLength);
    }
    if (prevId) {
      this.viewers = this.viewers.map((eachViewer) => {
        if (eachViewer.id === prevId) {
          eachViewer.id = curId;
        }
        return eachViewer;
      });
    } else {
      this.viewers[0].id = curId;
    }
  };

  public generateId = (length: number): string => {
    let str = '';
    const possible = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < length; i++) {
      str += possible[Math.floor(Math.random() * possible.length)];
    }
    return str;
  };

  public subscribeToCommands = () => {
    this.appService.idChangeRequest$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onIdChangeRequest);
    this.keyboardService.onKeyDown.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.handleKeyDown);
    window.addEventListener('resize', this.checkMinWidths);
  };

  public handleKeyDown = (event: KeyboardEvent) => {
    if (
      !this.showOptionsModal &&
      this.keyboardService.shiftActive &&
      event.key.toLowerCase() === 't' &&
      this.lastClosedViewers.length > 0
    ) {
      const lastViewer = this.lastClosedViewers.pop();
      if (lastViewer) {
        const previousViewer = {
          url: lastViewer.viewerState.url,
          options: {
            name: lastViewer.viewerState.name,
            showVideo: lastViewer.viewerState.showVideo,
            muteVideo: lastViewer.viewerState.muteVideo,
            useNative: lastViewer.viewerState.useNative,
            showHelp: lastViewer.viewerState._showHelp,
            xhrCredentials: lastViewer.viewerState.xhrCredentials,
            globalTokenActive: lastViewer.viewerState.globalTokenActive,
            showMetrics: lastViewer.viewerState.showMetrics,
            showCMCD: lastViewer.viewerState.showMetrics,
            showPlayerConfig: lastViewer.viewerState.showPlayerConfig,
            segmentInspector: lastViewer.viewerState.segmentInspector,
            showScteDisplay: lastViewer.viewerState.showScteDisplay,
            showStallDetector: lastViewer.viewerState.showStallDetector,
            showPlayerLogs: lastViewer.viewerState.showPlayerLogs,
            showSubtitles: lastViewer.viewerState.showSubtitles,
          },
        };
        this.addViewer(previousViewer, this.viewers.length - 1);
      }
    } else if (!this.showOptionsModal && event.key === 't') {
      const emptyViewer = {
        url: '',
        options: {
          name: DefaultViewerName,
          showVideo: false,
          muteVideo: false,
          useNative: false,
          showHelp: false,
          xhrCredentials: false,
          globalTokenActive: false,
          showMetrics: false,
          showCMCD: false,
          showPlayerConfig: false,
          segmentInspector: { show: false },
          showScteDisplay: false,
          showStallDetector: false,
          showPlayerLogs: false,
          showSubtitles: false,
        },
      };
      this.addViewer(emptyViewer, this.viewers.length - 1);
    }
  };

  public getViewerWidth = (viewerIndex: number) => {
    return this.viewerWidthsMap[viewerIndex];
  };

  public getViewerWidthPx = (viewerIndex: number) => {
    return (this.viewerWidthsMap[viewerIndex] / 100) * document.body.clientWidth;
  };

  public onDividerMouseDown = (event, viewerIndex: number) => {
    document.onmousemove = (moveEvent: MouseEvent) => {
      const pageWidth = document.body.clientWidth;
      let leftViewerStart = 0;
      let rightViewerEnd = pageWidth;
      for (let i = 0; i < this.viewers.length; i++) {
        if (i < viewerIndex) {
          leftViewerStart += (pageWidth * this.getViewerWidth(i)) / 100;
        } else if (i > viewerIndex + 1) {
          rightViewerEnd -= (pageWidth * this.getViewerWidth(i)) / 100;
        }
      }
      const leftBoundary = leftViewerStart + this.minViewerWidth;
      const rightBoundary = rightViewerEnd - this.minViewerWidth;
      if (leftBoundary < rightBoundary) {
        const cursorPositionX = Math.min(rightBoundary, Math.max(moveEvent.x, leftBoundary));
        this.viewerWidthsMap[viewerIndex] = ((cursorPositionX - leftViewerStart) / pageWidth) * 100;
        this.viewerWidthsMap[viewerIndex + 1] = ((rightViewerEnd - cursorPositionX) / pageWidth) * 100;
      }
    };
    document.onmouseup = () => {
      (document.onmousemove as any) = null;
      (document.onmouseup as any) = null;
      document.getElementsByTagName('body')[0].style.webkitUserSelect = 'auto';
    };
    // prevent everything being selected on mouse move
    document.getElementsByTagName('body')[0].style.webkitUserSelect = 'none';
  };

  public fillPlayerWidths = () => {
    let sum = 0;
    for (let i = 0; i < this.viewers.length; i++) {
      sum += this.getViewerWidth(i);
    }
    if (100 - sum) {
      for (let i = 0; i < this.viewers.length; i++) {
        if (!this.viewerWidthsMap[i]) {
          this.viewerWidthsMap[i] = this.getViewerWidth(i);
        }
        this.viewerWidthsMap[i] = (100 * this.viewerWidthsMap[i]) / sum;
      }
    }
    this.checkMinWidths();
  };

  public checkMinWidths = () => {
    const viewersBelowMinWidth: number[] = [];
    for (let i = 0; i < this.viewers.length; i++) {
      if (document.body.clientWidth * (this.getViewerWidth(i) / 100) < this.minViewerWidth) {
        viewersBelowMinWidth.push(i);
      }
    }
    if (viewersBelowMinWidth.length && viewersBelowMinWidth.length < this.viewers.length) {
      for (const i of viewersBelowMinWidth) {
        this.viewerWidthsMap[i] = (100 * this.minViewerWidth) / document.body.clientWidth + 0.1;
      }
      this.fillPlayerWidths();
    }
  };
}
