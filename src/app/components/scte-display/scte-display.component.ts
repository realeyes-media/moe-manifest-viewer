import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ViewerState } from 'src/app/shared';
import { SCTE35Data } from 'src/app/shared/models/sctce35Types';
import * as JSONView from 'json-view';

@Component({
  selector: 'app-scte-display',
  templateUrl: './scte-display.component.html',
  styleUrls: ['./scte-display.component.scss'],
})
export class ScteDisplayComponent implements AfterViewInit, OnDestroy {
  @Input() public viewerState: ViewerState;
  @ViewChild('jsonView', { static: false }) public jsonView: ElementRef<HTMLDivElement>;
  private ngUnsubscribe: Subject<void> = new Subject<void>();

  constructor() {}

  public ngAfterViewInit(): void {
    this.viewerState.scteData$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.receivedScteData);
  }

  public ngOnDestroy(): void {
    this.ngUnsubscribe.next();
  }

  public receivedScteData = (data: SCTE35Data) => {
    const scteData = data;

    if (data.data && typeof data.data === 'string') {
      try {
        scteData.data = JSON.parse(data.data);
      } catch (error) {
        console.error('error parsing scte data. ', error);
      }
    }

    const view = new JSONView('SCTE Data', scteData);
    view.nameEditable = false;
    view.valueEditable = false;
    view.expand(true);
    this.updateJsonView(view.dom);
  };

  public updateJsonView(dom: HTMLDivElement) {
    if (this.jsonView && this.jsonView.nativeElement) {
      this.jsonView.nativeElement.innerHTML = '';
      this.jsonView.nativeElement.appendChild(dom);
    }
  }
}
