import { Injectable } from '@angular/core';

@Injectable()
export class LoggerService {
  public logs: Array<string> = [];
  public subscribe: (eventType: any, callback: any) => void;
  public post: (eventType: any, args: any) => void;

  public hlsjsLog(logFn, level, message) {
    const hlsLog = `[Hls.js ${level}] -> ${message}`;
    logFn.call(console, hlsLog);
    this.logs.push(hlsLog);
  }

  public dashjsLog(logFn, level, message) {
    const dashLogs = `[Dash.js ${level}] -> ${message}`;
    logFn.call(console, dashLogs);
    this.logs.push(dashLogs);
  }

  public debug = (message) => {
    this.hlsjsLog(console.debug, 'debug', message);
  };

  public dashLog = (message) => {
    this.dashjsLog(console.log, 'log', message);
  };

  public log = (message) => {
    this.hlsjsLog(console.log, 'log', message);
  };

  public info = (message) => {
    this.hlsjsLog(console.info, 'info', message);
  };

  public warn = (message) => {
    this.hlsjsLog(console.warn, 'warn', message);
  };

  public error = (message) => {
    this.hlsjsLog(console.error, 'error', message);
  };
}
