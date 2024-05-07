import { Injectable } from '@angular/core';

@Injectable()
export class CopyService {
  constructor() {}

  public copyText(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let successful = false;
      if (!text) {
        reject();
      }
      if ((navigator as any).clipboard && (navigator as any).clipboard.writeText) {
        (navigator as any).clipboard.writeText(text).then(resolve, reject);
      } else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
        const textarea = document.createElement('textarea');
        textarea.textContent = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          successful = document.execCommand('copy');
        } catch (ex) {
          console.warn('Copy to clipboard failed.', ex);
          successful = false;
        } finally {
          document.body.removeChild(textarea);
        }
        if (successful) {
          resolve();
        } else {
          reject();
        }
      }
    });
  }
}
