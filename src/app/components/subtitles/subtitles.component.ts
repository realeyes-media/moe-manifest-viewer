import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AppService, ViewerState, ParsedManifest } from '../../shared';
import { BehaviorSubject, Subject } from 'rxjs';

@Component({
  selector: 'app-subtitles',
  templateUrl: './subtitles.component.html',
  styleUrls: ['./subtitles.component.scss'],
})
export class SubtitlesComponent {
  @Input() public manifestUpdate$: BehaviorSubject<ParsedManifest | null>;
  @Input() public viewerState: ViewerState;

  constructor() {}
}
