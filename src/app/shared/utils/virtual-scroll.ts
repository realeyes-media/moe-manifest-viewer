import {
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgModule,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  ViewChild,
  HostBinding,
} from '@angular/core';

import { Subject, BehaviorSubject } from 'rxjs';

import * as tween from '@tweenjs/tween.js';
import { takeUntil } from 'rxjs/operators';
import { ManifestLineObject } from '../../shared';
import { DashSegment } from '../models/dash-segment.model';

export interface ChangeEvent {
  start?: number;
  end?: number;
}

export type LineObject = ManifestLineObject | DashSegment;

@Component({
  selector: 'virtual-scroll,[virtualScroll]',
  exportAs: 'virtualScroll',
  template: `
    <div class="total-padding" #shim></div>
    <div class="scrollable-content" #content>
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        overflow: hidden;
        position: relative;
        display: block;
        -webkit-overflow-scrolling: touch;
      }
      .scrollable-content {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        position: absolute;
      }
      .total-padding {
        width: 1px;
        opacity: 0;
      }
    `,
  ],
})
export class VirtualScrollComponent implements OnInit, OnDestroy {
  @Input() public asyncItems: BehaviorSubject<LineObject[]> = new BehaviorSubject<LineObject[]>([]);

  @Input() public scrollbarWidth: number;

  @Input() public scrollbarHeight: number;

  @Input() public childWidth: number;

  @Input() public childHeight: number;

  @Input() public bufferAmount = 0;

  @Input() public scrollAnimationTime = 1500;

  @Input() public doNotCheckAngularZone = false;

  @Input()
  set parentScroll(element: Element | Window) {
    if (this._parentScroll === element) {
      return;
    }
    this._parentScroll = element;
    this.addParentEventHandlers(this._parentScroll);
  }

  get parentScroll(): Element | Window {
    return this._parentScroll;
  }

  @Output() public update: EventEmitter<any[]> = new EventEmitter<any[]>();

  @Output() public change: EventEmitter<ChangeEvent> = new EventEmitter<ChangeEvent>();

  @Output() public start: EventEmitter<ChangeEvent> = new EventEmitter<ChangeEvent>();

  @Output() public end: EventEmitter<ChangeEvent> = new EventEmitter<ChangeEvent>();

  @ViewChild('content', { read: ElementRef, static: true })
  public contentElementRef: ElementRef;

  @ViewChild('shim', { read: ElementRef, static: true })
  public shimElementRef: ElementRef;

  @ContentChild('container', { static: true }) public containerElementRef: ElementRef;

  @HostBinding('style.overflow-y') public overflowY: string = this.parentScroll ? 'hidden' : 'auto';

  public previousStart: number;
  public previousEnd: number;
  public startupLoop = true;
  public currentTween: any;
  public viewPortItems: LineObject[];

  private disposeScrollHandler: () => void | undefined;
  private disposeResizeHandler: () => void | undefined;
  private items: LineObject[] = [];
  private ngUnsubscribe: Subject<void> = new Subject<void>();

  /** Cache of the last scroll height to prevent setting CSS when not needed. */
  private lastScrollHeight = -1;

  /** Cache of the last top padding to prevent setting CSS when not needed. */
  private lastTopPadding = -1;
  private _parentScroll: Element | Window;

  constructor(private readonly element: ElementRef, private readonly renderer: Renderer2, private readonly zone: NgZone) {}

  public ngOnInit() {
    this.scrollbarWidth = 0; // this.element.nativeElement.offsetWidth - this.element.nativeElement.clientWidth;
    this.scrollbarHeight = 0; // this.element.nativeElement.offsetHeight - this.element.nativeElement.clientHeight;
    if (!this.parentScroll) {
      this.addParentEventHandlers(this.element.nativeElement);
    }
    this.asyncItems.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.onUpdate);
  }

  public ngOnDestroy() {
    this.removeParentEventHandlers();
    this.ngUnsubscribe.next();
  }

  public onUpdate = (lines: LineObject[]) => {
    this.items = lines;
    this.previousStart = 0;
    this.previousEnd = 0;
    this.refresh();
  };

  public refresh(forceViewportUpdate: boolean = false) {
    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.calculateItems(forceViewportUpdate);
      });
    });
  }

  public scrollInto(item: LineObject) {
    const el: Element = this.parentScroll instanceof Window ? document.body : this.parentScroll || this.element.nativeElement;
    const offsetTop = this.getElementsOffset();
    const index: number = (this.items || []).indexOf(item);
    if (index < 0 || index >= (this.items || []).length) {
      return;
    }

    const d = this.calculateDimensions();
    let scrollTop = Math.floor(index / d.itemsPerRow) * d.childHeight - d.childHeight * Math.min(index, this.bufferAmount);

    if (index === this.items.length - 1) {
      // scroll to bottom
      scrollTop = el.scrollHeight;
    }

    let animationRequest;

    if (this.currentTween !== undefined) {
      this.currentTween.stop();
    }

    // totally disable animate
    if (!this.scrollAnimationTime) {
      el.scrollTop = scrollTop;
      return;
    }

    this.currentTween = new tween.Tween({ scrollTop: el.scrollTop })
      .to({ scrollTop }, this.scrollAnimationTime)
      .easing(tween.Easing.Quadratic.Out)
      .onUpdate((data) => {
        if (isNaN(data.scrollTop)) {
          return;
        }
        this.renderer.setProperty(el, 'scrollTop', data.scrollTop);
        this.refresh();
      })
      .onStop(() => {
        cancelAnimationFrame(animationRequest);
      })
      .start();

    const animate = (time?) => {
      this.currentTween.update(time);
      if (this.currentTween._object.scrollTop !== scrollTop) {
        this.zone.runOutsideAngular(() => {
          animationRequest = requestAnimationFrame(animate);
        });
      }
    };

    animate();
  }

  private addParentEventHandlers(parentScroll: Element | Window) {
    this.removeParentEventHandlers();
    if (parentScroll) {
      this.zone.runOutsideAngular(() => {
        this.disposeScrollHandler = this.renderer.listen(parentScroll, 'scroll', this.refreshHandler);
        if (parentScroll instanceof Window) {
          this.disposeScrollHandler = this.renderer.listen('window', 'resize', this.refreshHandler);
        }
      });
    }
  }

  private removeParentEventHandlers() {
    if (this.disposeScrollHandler) {
      this.disposeScrollHandler();
      this.disposeScrollHandler = () => undefined;
    }
    if (this.disposeResizeHandler) {
      this.disposeResizeHandler();
      this.disposeResizeHandler = () => undefined;
    }
  }

  private countItemsPerRow() {
    let offsetTop;
    let itemsPerRow;
    const children = this.contentElementRef.nativeElement.children;
    for (itemsPerRow = 0; itemsPerRow < children.length; itemsPerRow++) {
      if (offsetTop !== undefined) {
        break;
      }
      offsetTop = children[itemsPerRow].offsetTop;
    }
    return itemsPerRow;
  }

  private getElementsOffset(): number {
    let offsetTop = 0;
    if (this.containerElementRef && this.containerElementRef.nativeElement) {
      offsetTop += this.containerElementRef.nativeElement.offsetTop;
    }
    if (this.parentScroll) {
      offsetTop += this.element.nativeElement.offsetTop;
    }
    return offsetTop;
  }

  private calculateDimensions() {
    const el: Element = this.parentScroll instanceof Window ? document.body : this.parentScroll || this.element.nativeElement;
    const items = this.items || [];
    const itemCount = items.length;
    const viewWidth = el.clientWidth - this.scrollbarWidth;
    const viewHeight = el.clientHeight - this.scrollbarHeight;

    let contentDimensions;
    if (this.childWidth === undefined || this.childHeight === undefined) {
      let content = this.contentElementRef.nativeElement;
      if (this.containerElementRef && this.containerElementRef.nativeElement) {
        content = this.containerElementRef.nativeElement;
      }
      contentDimensions = content.children[0]
        ? content.children[0].getBoundingClientRect()
        : {
            width: viewWidth,
            height: viewHeight,
          };
    }
    const childWidth = this.childWidth || contentDimensions.width;
    const childHeight = this.childHeight || contentDimensions.height;

    let itemsPerRow = Math.max(1, this.countItemsPerRow());
    const itemsPerRowByCalc = Math.max(1, Math.floor(viewWidth / childWidth));
    const itemsPerCol = Math.max(1, Math.floor(viewHeight / childHeight));
    const elScrollTop =
      this.parentScroll instanceof Window
        ? window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
        : el.scrollTop;
    const scrollTop = Math.max(0, elScrollTop);
    const scrollHeight = childHeight * Math.ceil(itemCount / itemsPerRow);
    if (itemsPerCol === 1 && Math.floor((scrollTop / scrollHeight) * itemCount) + itemsPerRowByCalc >= itemCount) {
      itemsPerRow = itemsPerRowByCalc;
    }

    if (scrollHeight !== this.lastScrollHeight) {
      this.renderer.setStyle(this.shimElementRef.nativeElement, 'height', `${scrollHeight}px`);
      this.lastScrollHeight = scrollHeight;
    }

    return {
      itemCount: itemCount,
      viewWidth: viewWidth,
      viewHeight: viewHeight,
      childWidth: childWidth,
      childHeight: childHeight,
      itemsPerRow: itemsPerRow,
      itemsPerCol: itemsPerCol,
      itemsPerRowByCalc: itemsPerRowByCalc,
      scrollHeight,
    };
  }

  private calculateItems(forceViewportUpdate: boolean = false) {
    if (!this.doNotCheckAngularZone) {
      NgZone.assertNotInAngularZone();
    }
    const el = this.parentScroll instanceof Window ? document.body : this.parentScroll || this.element.nativeElement;

    const d = this.calculateDimensions();
    const items = this.items || [];
    const offsetTop = this.getElementsOffset();
    let elScrollTop =
      this.parentScroll instanceof Window
        ? window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
        : el.scrollTop;

    if (elScrollTop > d.scrollHeight) {
      elScrollTop = d.scrollHeight + offsetTop;
    }

    const scrollTop = Math.max(0, elScrollTop - offsetTop);

    let indexByScrollTop = 0;
    //Prevent divisions by zero
    if (d.scrollHeight !== 0 && d.itemsPerRow !== 0) {
      indexByScrollTop = ((scrollTop / d.scrollHeight) * d.itemCount) / d.itemsPerRow;
    }
    let end = Math.min(d.itemCount, Math.ceil(indexByScrollTop) * d.itemsPerRow + d.itemsPerRow * (d.itemsPerCol + 1));

    let maxStartEnd = end;
    const modEnd = end % d.itemsPerRow;
    if (modEnd) {
      maxStartEnd = end + d.itemsPerRow - modEnd;
    }
    const maxStart = Math.max(0, maxStartEnd - d.itemsPerCol * d.itemsPerRow - d.itemsPerRow);
    let start = Math.min(maxStart, Math.floor(indexByScrollTop) * d.itemsPerRow);

    const topPadding =
      items == null || items.length === 0
        ? 0
        : d.childHeight * Math.ceil(start / d.itemsPerRow) - d.childHeight * Math.min(start, this.bufferAmount);

    if (topPadding !== this.lastTopPadding) {
      this.renderer.setStyle(this.contentElementRef.nativeElement, 'transform', `translateY(${topPadding}px)`);
      this.renderer.setStyle(this.contentElementRef.nativeElement, 'webkitTransform', `translateY(${topPadding}px)`);
      this.lastTopPadding = topPadding;
    }

    start = !isNaN(start) ? start : -1;
    end = !isNaN(end) ? end : -1;
    start -= this.bufferAmount;
    start = Math.max(0, start);
    end += this.bufferAmount;
    end = Math.min(items.length, end);
    if (start !== this.previousStart || end !== this.previousEnd || forceViewportUpdate === true) {
      this.zone.run(() => {
        // update the scroll list
        const _end = end >= 0 ? end : 0;
        // To prevent from accidentally selecting the entire array with a negative 1 (-1) in the end position.
        this.viewPortItems = items.slice(start, _end);
        this.update.emit(this.viewPortItems);

        // emit 'start' event
        if (start !== this.previousStart && this.startupLoop === false) {
          this.start.emit({ start, end });
        }

        // emit 'end' event
        if (end !== this.previousEnd && this.startupLoop === false) {
          this.end.emit({ start, end });
        }

        this.previousStart = start;
        this.previousEnd = end;

        if (this.startupLoop === true) {
          this.refresh();
        } else {
          this.change.emit({ start, end });
        }
      });
    } else if (this.startupLoop === true) {
      this.startupLoop = false;
      this.refresh();
    }
  }

  private refreshHandler = () => {
    this.refresh();
  };
}
