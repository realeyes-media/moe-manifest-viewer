import { Component, OnInit, ContentChildren, AfterContentInit, QueryList, Input, AfterViewInit, Output, EventEmitter } from '@angular/core';

import { ViewerState, ParsedManifest } from '../../shared';

import { Subject, BehaviorSubject } from 'rxjs';

import { TabComponent } from './../tab/tab.component';

@Component({
  selector: 'app-tabs-container',
  templateUrl: './tabs-container.component.html',
  styleUrls: ['./tabs-container.component.scss'],
})
export class TabsContainerComponent implements OnInit, AfterContentInit, AfterViewInit {
  @Input() public viewerState: ViewerState;
  @Input() public manifestUpdate$: BehaviorSubject<ParsedManifest>;
  @Input() public isOnlyViewer = false;
  @Input() public id: string;
  @Input() public type: 'hls' | 'dash' | 'unknown';
  @Input() public viewerReset$: Subject<void>;

  @Output() public setActiveTab = new EventEmitter<TabComponent>();
  @Output() public setPreviousTab = new EventEmitter<TabComponent>();
  @Output() public updateTabs = new EventEmitter<QueryList<TabComponent>>();

  @ContentChildren(TabComponent) public tabs: QueryList<TabComponent>;

  constructor() {}

  public ngOnInit() {}

  public ngAfterContentInit(): void {
    setTimeout(() => {
      const activeTabs = this.tabs.filter((tab) => tab.active);

      this.updateTabs.emit(this.tabs);

      if (activeTabs.length === 0) {
        this.selectTab(this.tabs.first);
      }
    }, 0);
  }

  public ngAfterViewInit() {
    setTimeout(() => {
      this.tabs.changes.subscribe(() => {
        this.updateTabs.emit(this.tabs);
      });
    }, 0);
  }

  public selectTab(tab: TabComponent) {
    this.setActiveTab.emit(tab);
  }
}
