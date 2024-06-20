import { Component, HostListener } from '@angular/core';
import { KeyboardService } from './../app/shared/services/keyboard.service';
import { AppService } from './shared';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  public optionsMenuShow = true;
  public showRelm = false;

  constructor(public keyBoardService: KeyboardService, public appService: AppService) {}

  @HostListener('contextmenu', ['$event'])
  public documentClick(event: MouseEvent): void {
    if (event.type === 'contextmenu') {
      this.keyBoardService.controlButton = false;
      this.keyBoardService.metaActive = false;
    }
  }

  public setOptionsShow = (show: boolean) => {
    this.optionsMenuShow = show;
  };

  public setRelmShow = (show: boolean) => {
    this.showRelm = show;
  };
}
