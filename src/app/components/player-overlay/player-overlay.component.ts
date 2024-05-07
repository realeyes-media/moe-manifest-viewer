import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Component({
  selector: 'app-player-overlay',
  templateUrl: './player-overlay.component.html',
  styleUrls: ['./player-overlay.component.scss'],
})
export class PlayerOverlayComponent {
  @Input() public bitrates$: BehaviorSubject<number[]>;
  @Input() public currentBitrate: number;
  @Input() public playerHeight: number;
  @Input() public muted: boolean;
  @Input() public version: string;
  @Input() public width: number;
  @Input() public usingAbr: boolean;

  @Output()
  public bitrateSelect: EventEmitter<{
    bitrate: number;
    mouseEvent: MouseEvent;
  }> = new EventEmitter<{ bitrate: number; mouseEvent: MouseEvent }>();
  @Output() public autoSelect: EventEmitter<void> = new EventEmitter<void>();
  @Output() public toggleMute: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor() {}

  public emitBitrate = (bitrate: number, mouseEvent: MouseEvent): void => {
    this.bitrateSelect.emit({ bitrate: bitrate, mouseEvent: mouseEvent });
  };

  public onAutoSelect = (): void => {
    this.autoSelect.emit();
  };

  public toggleMuteVideo = (mutedVideo: boolean): void => {
    this.toggleMute.emit(mutedVideo);
  };
}
