import { Component, OnInit, Input, Output, EventEmitter, ContentChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import {
  ViewerState,
  ParsedManifest,
  Metric,
  AppService,
  ScrollTypes,
  ManifestLineObject,
  TabsObject,
  AppServiceScroll,
  VideoPlayers,
} from '../../shared';
import { TabObjectName } from '../../shared/models/tabs.model';
import { TabComponent } from '../tab/tab.component';
import { BehaviorSubject, Subject } from 'rxjs';

import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-info-container',
  templateUrl: './info-container.component.html',
  styleUrls: ['./info-container.component.scss'],
})
export class InfoContainerComponent implements OnInit {
  @Input() public viewerState: ViewerState;
  @Input() public manifest: ManifestLineObject[];
  @Input() public manifestUpdate$: BehaviorSubject<ParsedManifest>;
  @Input() public isOnlyViewer = false;
  @Input() public id: string;
  @Input() public type: 'hls' | 'dash' | 'unknown';
  @Input() public selectedPlayer: VideoPlayers;
  @Input() public viewerReset$: Subject<void>;
  @Input() public useNative: boolean;
  @Input() public levels: Hls.Level[];

  @Output() public seek = new EventEmitter<Metric>();
  @Output() public loadLevelRequest = new EventEmitter<string>();

  @ContentChildren(TabComponent) public tabs: QueryList<TabComponent>;

  public scrolling: ScrollTypes = ScrollTypes.AUTO_SCROLL;

  private ngUnsubscribe: Subject<void> = new Subject<void>();

  public currentTab: TabsObject;

  public tabName = TabObjectName;
  public tabArray: TabComponent[];

  constructor(private appService: AppService, private cd: ChangeDetectorRef) {}

  public ngOnInit() {
    this.subscribeToCommands();
  }

  public subscribeToCommands = () => {
    this.appService.toggleScrolling$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.setScrolling);
    this.viewerState.setActiveTab$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((tab) => this.updateActiveTab(tab));
  };

  public setScrolling = (value: AppServiceScroll) => {
    if (value.viewerStateId === this.viewerState.id) {
      this.scrolling = value.currentScoll;
    }
  };

  public seekToObj = (obj: Metric) => {
    this.seek.emit(obj);
  };

  public emitLoadLevelRequest = (data: string) => {
    this.loadLevelRequest.emit(data);
  };

  public selectActiveTab(tab: TabComponent) {
    if (this.tabArray) {
      this.tabArray.forEach((tabs) => (tabs.active = false));
    }
    tab.active = true;
  }

  public updateActiveTab(tabObject: TabsObject) {
    this.currentTab = tabObject;
  }

  public updateTabs(tabs: QueryList<TabComponent>) {
    this.tabArray = tabs.toArray();
    if (this.currentTab) {
      this.tabArray.forEach((tab) => {
        if (this.currentTab.toggled === true && this.currentTab.tabTitle === tab.tabTitle) {
          tab.active = true;
        } else {
          tab.active = false;
        }
        if (this.currentTab.toggled === false) {
          const last_element = this.tabArray[this.tabArray.length - 1];
          tabs.toArray().forEach((currTab) => (currTab.active = false));
          last_element.active = true;
        }
      });
      this.cd.detectChanges();
    }
  }
}
