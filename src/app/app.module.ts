// Angular
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { ClickOutsideModule } from 'ng-click-outside';
import { VirtualScrollComponent } from './shared/utils/virtual-scroll';
import { HttpClientModule } from '@angular/common/http';
import { Md5 } from 'ts-md5/dist/md5';
// Components
import { AppComponent } from './app.component';
import {
  HlsPlayerComponent,
  DashPlayerComponent,
  WrapperComponent,
  ManifestViewerComponent,
  RelmMenuComponent,
  OptionsModalComponent,
} from './components';

// Services
import {
  UrlVarsService,
  DataService,
  ParserService,
  AppService,
  CopyService,
  StorageService,
  KeyboardService,
  UserAgentUtil,
  LoggerService,
  GoogleAnalyticsEventsService,
} from './shared';
import { PlayerOverlayComponent } from './components/player-overlay/player-overlay.component';
import { TextComponent } from './components/text/text.component';
import { ViewerDropdownComponent } from './components/viewer-dropdown/viewer-dropdown.component';
import { BitrateDropdownComponent } from './components/bitrate-dropdown/bitrate-dropdown.component';
import { DataComponent } from './components/data/data.component';
import { CMCDComponent } from './components/cmcd/cmcd.component';
import { PlayerConfigComponent } from './components/player-config/player-config.component';
import { MetricsDropdownComponent } from './components/metrics-dropdown/metrics-dropdown.component';
import { StallDetectorComponent } from './components/stall-detector/stall-detector.component';
import { SubtitlesViewerComponent } from './components/subtitles-viewer/subtitles-viewer.component';
import { InfoContainerComponent } from './components/info-container/info-container.component';
import { ErrorDisplayComponent } from './components/error-display/error-display.component';
import { IconBarComponent } from './components/icon-bar/icon-bar.component';
import { PlayerLogsComponent } from './components/player-logs/player-logs.component';
import { TabComponent } from './components/tab/tab.component';
import { TabsContainerComponent } from './components/tabs-container/tabs-container.component';
import { HelpComponent } from './components/help/help.component';
import { SegmentInspectorComponent } from './components/segment-inspector/segment-inspector.component';
import { ChartistModule } from 'ng-chartist';
import { DownloadDataManager } from './shared/services/download-data-manager.service';
import { DrmModalComponent } from './components/drm-modal/drm-modal.component';

import { ToastrModule } from 'ngx-toastr';
import { ShakaPlayerComponent } from './components/shaka-player/shaka-player.component';
import * as Shakajs from 'shaka-player';
import { PlayerDropdownComponent } from './components/player-dropdown/player-dropdown.component';
import { PipesModule } from './shared/pipes/pipes.module';
import { ScteDisplayComponent } from './components/scte-display/scte-display.component';
import { SubtitlesComponent } from './components/subtitles/subtitles.component';

declare global {
  var Shaka: typeof Shakajs;
}

@NgModule({
  declarations: [
    AppComponent,
    HlsPlayerComponent,
    DashPlayerComponent,
    WrapperComponent,
    ManifestViewerComponent,
    RelmMenuComponent,
    OptionsModalComponent,
    PlayerOverlayComponent,
    VirtualScrollComponent,
    TextComponent,
    ViewerDropdownComponent,
    BitrateDropdownComponent,
    DataComponent,
    CMCDComponent,
    MetricsDropdownComponent,
    StallDetectorComponent,
    SubtitlesViewerComponent,
    SubtitlesComponent,
    InfoContainerComponent,
    ErrorDisplayComponent,
    IconBarComponent,
    PlayerLogsComponent,
    TabComponent,
    TabsContainerComponent,
    HelpComponent,
    SegmentInspectorComponent,
    DrmModalComponent,
    ShakaPlayerComponent,
    PlayerDropdownComponent,
    ScteDisplayComponent,
    PlayerConfigComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ClickOutsideModule,
    ChartistModule,
    HttpClientModule,
    ToastrModule.forRoot({ positionClass: 'toast-top-center' }),
    PipesModule,
  ],
  providers: [
    UrlVarsService,
    DataService,
    ParserService,
    AppService,
    CopyService,
    StorageService,
    KeyboardService,
    DownloadDataManager,
    UserAgentUtil,
    LoggerService,
    GoogleAnalyticsEventsService,
    Md5,
  ],
  entryComponents: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule {}
