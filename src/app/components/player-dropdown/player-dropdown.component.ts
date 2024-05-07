import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { VideoPlayers, VideoSourceType } from 'src/app/shared';

@Component({
  selector: 'app-player-dropdown',
  templateUrl: './player-dropdown.component.html',
  styleUrls: ['./player-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerDropdownComponent implements OnInit {
  public VideoPlayers = VideoPlayers;
  @Input() public selectedPlayer: VideoPlayers;
  @Input() public allplayers = [VideoPlayers.HLS_PLAYER, VideoPlayers.DASH_PLAYER, VideoPlayers.SHAKA_PLAYER, VideoPlayers.NONE];
  @Input() public streamType: VideoSourceType;

  @Output()
  public playerSelect = new EventEmitter<VideoPlayers>();

  public closed = true;

  constructor() {}

  public ngOnInit() {}

  public playerClick = (player: VideoPlayers): void => {
    this.playerSelect.emit(player);
    this.toggleMenu(false);
  };

  public toggleMenu = (val: boolean) => {
    this.closed = !val;
  };

  public canPlayType = (player: VideoPlayers) => this.streamType === player || player === VideoPlayers.SHAKA_PLAYER;

  public selectedPlayerClick = () => {
    this.closed ? this.toggleMenu(true) : this.playerClick(this.selectedPlayer);
  };
}
