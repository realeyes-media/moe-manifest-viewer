import './polyfills.ts';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { AppModule } from './app/';

let isBlacklisted = true;

// whitelisted domains
const hn = [
  'bXYucmVhbGV5ZXMuY2xvdWQ=', // mv.realeyes.cloud
  'bXYucmVhbGV5ZXMuY29t', // mv.realeyes.com
];

if (environment.production) {
  enableProdMode();
  for (const i of hn) {
    if (location.hostname === atob(i)) {
      isBlacklisted = false;
    }
  }
} else {
  isBlacklisted = false;
}

if (!isBlacklisted) {
  platformBrowserDynamic().bootstrapModule(AppModule);
} else {
  // remove spinner
  const documentBody = document.body;
  while (documentBody.firstChild) {
    documentBody.removeChild(documentBody.firstChild);
  }
  document.body.innerText = 'Access is currently restricted. Contact info@realeyes.com to allow further access.';
}
