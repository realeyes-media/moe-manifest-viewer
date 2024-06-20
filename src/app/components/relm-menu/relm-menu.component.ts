import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { AppService } from '../../shared';

@Component({
  selector: 'app-relm-menu',
  templateUrl: 'relm-menu.component.html',
  styleUrls: ['relm-menu.component.scss'],
})
export class RelmMenuComponent implements OnInit {
  @Output() public closeRelm = new EventEmitter<void>();
  public setManifestUrl: string;
  public token: string;
  public startTime = '0';
  public fileType = 'm3u8';

  constructor(private appService: AppService) {}

  public ngOnInit() {}

  public close() {
    this.closeRelm.emit();
  }

  public createRelmUrl = (url: string, token: string, startTime: string, fileType: string) => {
    let relmUrl = 'http://relm.realeyes.com/manifest?manifest=' + url;
    if (token) {
      relmUrl += '&token=' + token;
    }
    if (startTime) {
      relmUrl += '&startTime=' + startTime;
    }
    if (fileType) {
      relmUrl += '&type=' + fileType;
    }

    this.appService.emitRelm(relmUrl);
    this.appService.toggleRelmMenu(false);
  };
}
