import { Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import 'hls-ts/dist/hls-ts';
import * as JSONView from 'json-view';
import { ManifestLineObject, ViewerState } from '../../shared';

export interface SegmentToSearch {
  segment: string;
  number?: boolean;
}
@Component({
  selector: 'app-segment-inspector',
  templateUrl: './segment-inspector.component.html',
  styleUrls: ['./segment-inspector.component.scss'],
})
export class SegmentInspectorComponent implements OnChanges {
  public parserTS = new HlsTs({ debug: false });
  public JSONObjectData: JSON;
  public avcPayload: any;
  public avcParser: any;
  public urlToSearch: string;
  public error = false;
  public protectedStreamError = '';

  @Input() public url = '';
  @Input() public viewerState: ViewerState;
  @Input() public manifest: ManifestLineObject[];
  @ViewChild('jsonView', { static: false }) public jsonView: ElementRef<HTMLDivElement>;

  constructor() {}

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.url && changes.url.currentValue !== changes.url.previousValue) {
      this.onUrlChange(changes.url.currentValue);
    }
  }

  private onUrlChange(url: string) {
    if (this.viewerState && this.viewerState.protectedStream) {
      this.setErrorMessage();
      return;
    }
    this.resetErrorMessage();
    if (this.isUrlTS) {
      this.fetchTSdata(url);
    }
  }

  public updateJsonView(dom: HTMLDivElement) {
    if (this.jsonView && this.jsonView.nativeElement) {
      this.jsonView.nativeElement.innerHTML = '';
      this.jsonView.nativeElement.appendChild(dom);
    }
  }

  public setErrorMessage() {
    this.protectedStreamError = 'This functionality is disabled for encrypted streams';
    this.error = true;
  }

  public resetErrorMessage() {
    this.protectedStreamError = '';
    this.error = false;
  }

  public get urlType() {
    const { url = '' } = this;
    const parsedURL = this.urlParser(url);
    const pathname = parsedURL ? parsedURL.pathname : '';
    return pathname ? pathname.split('.').pop() : '';
  }

  public get isUrlTS() {
    return this.urlType === 'ts';
  }

  public isPathString(url: string) {
    return url.includes('.ts') || url.includes('.mp4') || url.includes('.m4s') || url.includes('.fmp4');
  }

  public onClick() {
    if (this.viewerState && this.viewerState.protectedStream) {
      this.setErrorMessage();
      return;
    }
    this.resetErrorMessage();

    const { urlToSearch = '' } = this;
    const { url = '' } =
      this.manifest
        .filter((line) => line.url)
        .find((line) => {
          const { pathname: urlPathname = '' } = this.urlParser(line.url) || {};
          const { pathname: searchPathname = '' } = this.urlParser(urlToSearch) || {};

          return this.isPathString(urlToSearch)
            ? urlToSearch.includes(line.str) || (urlPathname !== '' && searchPathname !== '' && urlPathname === searchPathname)
            : line.url !== undefined && ((line.url.split('/').pop() || '').includes(urlToSearch) || line.url.includes(urlToSearch));
        }) || {};

    this.error = url === '';
    this.url = !this.error ? url : this.url;
    this.viewerState.segmentInspector.url = this.url;
    this.viewerState.segmentInspector.show = !this.error || this.viewerState.segmentInspector.show;
  }

  public onKeyDown(event: KeyboardEvent) {
    if (event.keyCode === 13) {
      this.onClick();
    }
  }

  private truncateArrays(obj: Object) {
    return Object.keys(obj).reduce(
      (out, key) => ({
        ...out,
        [key]:
          Array.isArray(obj[key]) || obj[key] instanceof Uint8Array
            ? [obj[key][0], 'More Bytes...']
            : typeof obj[key] === 'object'
            ? this.truncateArrays(obj[key])
            : obj[key],
      }),
      {}
    );
  }

  private fetchTSdata(url: string) {
    const loadingView = document.createElement('div');
    loadingView.innerText = 'Loading . . .';
    this.updateJsonView(loadingView);

    fetch(url)
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer))
      .then((data) =>
        this.parserTS
          .parse(data)
          .then(() => {
            this.resetErrorMessage();
            const parser = this.parserTS;
            this.avcPayload = parser.getDataStreamByProgramType('avc');
            this.avcParser = parser.createAvcParser(this.avcPayload);
            const jsonData = {
              programs: this.truncateArrays(parser.getPrograms()),
              avcPackets: this.truncateArrays({ '[Byte Arrays]': parser.getPacketsByProgramType('avc') }),
              avcPayload: this.truncateArrays(this.avcPayload),
              avcParser: this.truncateArrays(this.avcParser),
              nalUnits: this.truncateArrays({ '[Byte Arrays]': this.avcParser.getNalUnits() }),
            };
            const view = new JSONView('Data', jsonData);
            view.nameEditable = false;
            view.valueEditable = false;
            this.updateJsonView(view.dom);
          })
          .catch((error) => {
            if (this.viewerState && this.viewerState.protectedStream) {
              this.setErrorMessage();
              return;
            } else {
              this.error = true;
            }
          })
      );
  }

  private urlParser(url: string = ''): URL | undefined {
    let output: URL | undefined;
    try {
      output = new URL(url);
    } catch {
      output = undefined;
    }
    return output;
  }
}
