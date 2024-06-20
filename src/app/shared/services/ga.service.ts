import { Injectable } from '@angular/core';
declare var ga: Function;

@Injectable()
export class GoogleAnalyticsEventsService {
  constructor() {}
  public emitEvent(eventCategory: string, eventAction: any, eventLabel: string) {
    ga('send', 'event', { eventCategory, eventLabel, eventAction });
  }
}
