import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export class KeyboardService {
  public onKeyUp = new Subject<KeyboardEvent>();
  public onKeyDown = new Subject<KeyboardEvent>();
  public shiftActive: boolean;
  public controlButton: boolean;
  public metaActive: boolean;

  private keyPressMap: {
    [code: string]: boolean;
  } = {};

  constructor() {
    window.onkeyup = this.onKeyRelease;
    window.onkeydown = this.onGeneralKeys;
  }

  private onGeneralKeys = (event: KeyboardEvent) => {
    if (!this.keyPressMap[event.keyCode]) {
      if (event.key === 'Shift') {
        this.shiftActive = true;
      }
      if (event.key === 'Control' && navigator.platform !== 'MacIntel') {
        this.controlButton = true;
      }
      if (event.key === 'Meta') {
        this.metaActive = true;
      }
      if (document.activeElement && document.activeElement.nodeName !== 'INPUT' && document.activeElement.nodeName !== 'TEXTAREA') {
        this.onKeyDown.next(event);
      }
    }
    this.keyPressMap[event.keyCode] = true;
  };

  private onKeyRelease = (event: KeyboardEvent) => {
    if (event.key === 'Shift') {
      this.shiftActive = false;
    }
    if (event.key === 'Control') {
      this.controlButton = false;
    }
    if (event.key === 'Meta') {
      this.metaActive = false;
    }

    if (document.activeElement && document.activeElement.nodeName !== 'INPUT' && document.activeElement.nodeName !== 'TEXTAREA') {
      this.onKeyUp.next(event);
    }
    this.keyPressMap[event.keyCode] = false;
  };

  public get cntrlActive(): boolean {
    return this.controlButton || this.metaActive;
  }
}
