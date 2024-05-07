import { Component, OnInit, Input } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { ViewerState, PlayerConfigs, StorageService, AppService, VideoPlayers } from '../../shared';

@Component({
  selector: 'app-player-config',
  templateUrl: './player-config.component.html',
  styleUrls: ['./player-config.component.scss'],
})
export class PlayerConfigComponent implements OnInit {
  @Input() public viewerState: ViewerState;

  public playerConfigs: PlayerConfigs = {
    [VideoPlayers.HLS_PLAYER]: undefined,
    [VideoPlayers.DASH_PLAYER]: undefined,
    [VideoPlayers.SHAKA_PLAYER]: undefined,
  };

  public customConfig: string;
  private ngUnsubscribe: Subject<void> = new Subject<void>();

  constructor(public storageService: StorageService, public appService: AppService, private toastrService: ToastrService) {}

  ngOnInit(): void {
    this.initSubscribers();
    this.updateCurrentConfig();
  }

  private initSubscribers() {
    this.viewerState.playerSelectedChanged$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.updateCurrentConfig);
    this.viewerState.playerConfigChanged$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.updateCurrentConfig);
  }

  public updateCurrentConfig = () => {
    this.playerConfigs = this.viewerState.playerConfigs;
    const currentPlayer = this.storageService.getSelectedPlayer();
    const currentPlayerConfig = this.playerConfigs[currentPlayer];
    if (currentPlayerConfig) {
      this.customConfig = currentPlayerConfig;
    } else {
      this.customConfig = '';
    }
  };

  public applyCustomPlayerConfig(): void {
    try {
      if (this.customConfig) {
        JSON.parse(this.customConfig);
        this.appService.updatePlayerConfig(this.customConfig);
        this.toastrService.success(`The config entered was applied successfully.`, `Loading the player config success`);
      }
    } catch (error) {
      this.toastrService.error(`The config entered doesn't have the correct JSON structure.`, `Loading the player config failed`);
    }
  }
}
