import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs/index';

import { ParsedManifest, ViewerState, ParserService, DataService, Subtitles, ManifestLineObject } from '../../shared';

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

interface SubtitlesLine {
  start: number;
  end: number;
  text: string;
}

@Component({
  selector: 'app-subtitles-viewer',
  templateUrl: './subtitles-viewer.component.html',
  styleUrls: ['./subtitles-viewer.component.scss'],
})
export class SubtitlesViewerComponent implements OnInit, OnDestroy {
  @Input() public manifestUpdate$: BehaviorSubject<ParsedManifest | null>;
  @Input() public viewerState: ViewerState;

  public manifestLevels: ManifestLevel[];
  public showMasterUrl: boolean;
  public urlText = 'Show Master Url';
  public subtitles: Subtitles[];
  public selectedSubtitles: Subtitles;
  public subtitlesLine: SubtitlesLine[];
  private currentEnd: number = 0;
  private currentTime: number = 0;
  private ngUnsubscribe: Subject<void> = new Subject<void>();
  private subtitleIndex: number = 0;
  private subtitleManifest: ManifestLineObject[];

  constructor(private dataService: DataService, private parserService: ParserService) {}

  public async ngOnInit() {
    this.viewerState.currentDisplayTime$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.handleTime);
    this.viewerState.selectedSubtitles$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.handleSelectedSubtitles);
    this.viewerState.subtitles$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.handleSubtitles);
    this.subtitleIndex = this.viewerState.subtitles.findIndex((element) => element?.name === this.viewerState.selectedSubtitles?.name);
    await this.handleSubtitles(this.viewerState.subtitles);
    this.subtitlesLine = [];
  }

  public onChangeLanguage = (value: string) => {
    this.subtitleIndex = value !== 'none' ? this.viewerState.subtitles.findIndex((element) => element.name === value) : -1;
    this.handleSubtitles(this.viewerState.subtitles);
  };

  private getSubtitles = async (manifestLineObject: ManifestLineObject) => {
    if (manifestLineObject.url) {
      const allText = ((await this.dataService.getManifest(manifestLineObject.url)).text ?? '').split('\n');
      allText.forEach((value, key) => {
        if (value.includes('-->')) {
          const times = value.split('-->');
          let lineKey = key + 1;
          let lineText = '';
          while (allText[lineKey] && !allText[lineKey]?.includes('-->')) {
            if (lineText) {
              lineText += `\n ${allText[lineKey]}`;
            } else {
              lineText = allText[lineKey];
            }
            lineKey = lineKey + 1;
          }
          this.subtitlesLine.push({
            start: this.convertToSeconds(times[0]),
            end: this.convertToSeconds(times[1]),
            text: lineText,
          });
        }
      });
    }
  };

  private convertToSeconds = (time: string) => {
    const timeValues = time.replace(/\s+/g, '').split(':');
    switch (timeValues.length) {
      case 2:
        return Number(timeValues[0]) * 60 + Number(timeValues[1]);
      case 3:
        return Number(timeValues[0]) * 3600 + Number(timeValues[1]) * 60 + Number(timeValues[2]);
      default:
        return Number(timeValues[0]);
    }
  };

  private handleSubtitles = (subtitles: Subtitles[]): void => {
    let newSubtitles;
    if (this.subtitleIndex >= 0) {
      newSubtitles = subtitles[this.subtitleIndex];
      if (this.selectedSubtitles === newSubtitles) {
        return;
      }
    } else {
      newSubtitles = {};
    }
    this.initSelectedSubtitles(newSubtitles);
    this.viewerState.updateSelectedSubtitles(this.selectedSubtitles as Subtitles);
  };

  private handleSelectedSubtitles = (subtitle: Subtitles): void => {
    if (this.selectedSubtitles === subtitle) {
      return;
    }
    this.initSelectedSubtitles(subtitle);
  };

  private async initSelectedSubtitles(subtitle: Subtitles): Promise<void> {
    this.selectedSubtitles = subtitle;
    this.subtitlesLine = [];
    if (this.selectedSubtitles.url) {
      let receivedSubtitleManifest = await this.dataService.getManifest(this.selectedSubtitles.url).then(this.parserService.parseManifest);
      this.subtitleManifest = receivedSubtitleManifest.lines?.filter((line) => line.startTime !== undefined && line.stream);
    } else {
      this.subtitleManifest = [];
    }
  }

  private handleTime = (seconds: number) => {
    if (seconds > this.currentEnd || seconds < this.currentTime) {
      const line = this.subtitlesLine?.find((subtitle) => subtitle.start <= seconds && subtitle.end > seconds);
      this.currentEnd = line?.end ?? 0;
      const text = line?.text ?? '';
      this.viewerState.updateCaption(text);
      if (!line && this.subtitleManifest) {
        const nextPossibleManifest = this.subtitleManifest.find((value, key) => {
          const startTime = value.startTime;
          const fragDuration = value.fragDuration;
          if (startTime && fragDuration && value.loadStatus !== 'loaded') {
            this.subtitleManifest[key].loadStatus = startTime <= seconds && startTime + fragDuration > seconds ? 'loaded' : '';
            return this.subtitleManifest[key].loadStatus === 'loaded';
          } else {
            return false;
          }
        });
        if (nextPossibleManifest) {
          this.getSubtitles(nextPossibleManifest);
        }
      }
    }
    this.currentTime = seconds;
  };

  public ngOnDestroy() {
    this.viewerState.updateCaption('');
    this.ngUnsubscribe.next();
  }
}
