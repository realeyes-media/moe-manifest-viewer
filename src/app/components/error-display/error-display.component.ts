import { Component, OnInit, Input } from '@angular/core';
import { ErrorTypes, ManifestResponse } from '../../shared';

@Component({
  selector: 'app-error-display',
  templateUrl: './error-display.component.html',
  styleUrls: ['./error-display.component.scss'],
})
export class ErrorDisplayComponent implements OnInit {
  @Input() public manifestResponse: ManifestResponse;
  @Input() public generatePermalinkUrl: Function;

  public errorType: ErrorTypes;

  constructor() {}

  public ngOnInit() {
    if (this.manifestResponse) {
      if (
        this.manifestResponse.status === 0 &&
        this.manifestResponse.url &&
        new URL(this.manifestResponse.url).protocol === 'http:' &&
        location.protocol === 'https:'
      ) {
        this.errorType = 'mixedContentError';
      } else {
        this.errorType = 'generalLoadError';
      }
    }
  }

  public onHttpClick = () => {
    const httpPermalink = this.generatePermalinkUrl(true);
    window.open(httpPermalink, '_blank');
  };
}
