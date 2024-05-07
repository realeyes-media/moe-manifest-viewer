import { Component, OnInit, Input, EventEmitter, Output, QueryList, ContentChildren } from '@angular/core';
import { ViewerState, TabsObject } from '../../shared';
import { TabComponent } from './../tab/tab.component';
import { TabObjectName } from '../../shared/models/tabs.model';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
})
export class HelpComponent implements OnInit {
  @Input() public viewerState: ViewerState;

  @Output() public onToggleHelp = new EventEmitter<boolean>();

  public activeTab: string;

  public currentTab: TabsObject;

  public tabArray: TabComponent[];

  public tabName = TabObjectName;

  @ContentChildren(TabComponent) public tabs: QueryList<TabComponent>;

  constructor() {}

  public ngOnInit() {
    this.activeTab = 'HotKeys';
  }

  public selectActiveTab(tab: TabComponent) {
    if (this.tabs) {
      this.tabArray.forEach((tabs) => (tabs.active = false));
    }
    tab.active = true;
  }

  public updateTabs(tabs: QueryList<TabComponent>) {
    this.tabArray = tabs.toArray();
  }

  public closeHelp(toggled: boolean) {
    this.onToggleHelp.emit(toggled);
  }
}
