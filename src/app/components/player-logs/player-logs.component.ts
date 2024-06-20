import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewChecked, EventEmitter } from '@angular/core';
import { ViewerState, LoggerService, ScrollTypes, GoogleAnalyticsEventsService } from '../../shared';
@Component({
  selector: 'app-player-logs',
  templateUrl: './player-logs.component.html',
  styleUrls: ['./player-logs.component.scss'],
})
export class PlayerLogsComponent implements OnInit, AfterViewChecked {
  public GA_CLICK = 'Click';
  public GA_PLAYER_LOGS = 'Player Logs';
  public scrollTypes = ScrollTypes;

  @Input() public viewerState: ViewerState;
  @Input() public scrolling: ScrollTypes | string;

  public onScrollingSet = new EventEmitter<ScrollTypes>();

  @ViewChild('scrollPlayerLogs', { static: true }) private scrollContainer: ElementRef;

  constructor(public loggerService: LoggerService, public ga: GoogleAnalyticsEventsService) {}

  public ngOnInit() {
    this.scrolling = ScrollTypes.TAIL_MANIFEST;
  }

  public ngAfterViewChecked() {
    if (this.scrolling === 'tailManifest') {
      this.scrollToBottom();
    }
  }

  public submitEvent(Category: string, Action: string, Label: string) {
    this.ga.emitEvent(Category, Action, Label);
  }

  public setScrolling = (scrollType: ScrollTypes) => {
    this.submitEvent(this.GA_CLICK, 'SetScrollingType:' + scrollType, this.GA_PLAYER_LOGS);
    this.scrolling = scrollType;
    if (scrollType === ScrollTypes.TAIL_MANIFEST) {
      this.scrollToBottom();
    } else if (scrollType === 'none') {
      this.scrolling = ScrollTypes.NONE;
    }
  };

  public scrollToBottom(): void {
    if (this.scrolling === ScrollTypes.TAIL_MANIFEST) {
      try {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      } catch (err) {
        this.scrolling = ScrollTypes.NONE;
      }
    }
  }

  public onMouseWheel = (event: Event) => {
    this.scrolling = ScrollTypes.NONE;
  };
}
