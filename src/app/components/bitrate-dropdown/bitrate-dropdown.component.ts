import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-bitrate-dropdown',
  templateUrl: './bitrate-dropdown.component.html',
  styleUrls: ['./bitrate-dropdown.component.scss'],
})
export class BitrateDropdownComponent implements OnInit {
  @Input() public currentBitrate: number;
  @Input() public bitrates: number[];
  @Input() public auto = true;
  @Input() public usingAbr;

  @Output()
  public bitrateSelect = new EventEmitter<{
    bitrate: number;
    mouseEvent: MouseEvent;
  }>();
  @Output() public autoSelect = new EventEmitter<void>();

  public closed = true;

  constructor() {}

  public ngOnInit() {}

  public bitrateClick = (bitrate: number, mouseEvent: MouseEvent): void => {
    this.bitrateSelect.emit({ bitrate: bitrate, mouseEvent: mouseEvent });
    this.toggleMenu(false);
  };

  public toggleMenu = (val: boolean) => {
    this.closed = !val;
  };

  public onAutoSelect = (): void => {
    this.autoSelect.emit();
  };
}
