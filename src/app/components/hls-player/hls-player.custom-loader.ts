import * as HlsTypes from 'hls.js';

const AGE_HEADER_LINE_REGEX = /^age:\s*[\d.]+\s*$/m;

class LoadStats implements HlsTypes.LoaderStats {
  aborted: boolean = false;
  loaded: number = 0;
  retry: number = 0;
  total: number = 0;
  chunkCount: number = 0;
  bwEstimate: number = 0;
  loading: HlsTypes.HlsProgressivePerformanceTiming = { start: 0, first: 0, end: 0 };
  parsing: HlsTypes.HlsPerformanceTiming = { start: 0, end: 0 };
  buffering: HlsTypes.HlsProgressivePerformanceTiming = { start: 0, first: 0, end: 0 };
}

export class customXhrLoader implements HlsTypes.Loader<HlsTypes.LoaderContext> {
  private xhrSetup: Function | null;
  private requestTimeout?: number;
  private retryTimeout?: number;
  private retryDelay: number;
  private config: HlsTypes.LoaderConfiguration | null = null;
  private callbacks: HlsTypes.LoaderCallbacks<HlsTypes.LoaderContext> | null = null;
  public context!: HlsTypes.LoaderContext;

  private loader: XMLHttpRequest | null = null;
  public stats: HlsTypes.LoaderStats;

  constructor(config /* HlsConfig */) {
    this.xhrSetup = config ? config.xhrSetup : null;
    this.stats = new LoadStats();
    this.retryDelay = 0;
  }

  destroy(): void {
    this.callbacks = null;
    this.abortInternal();
    this.loader = null;
    this.config = null;
  }

  abortInternal(): void {
    const loader = this.loader;
    self.clearTimeout(this.requestTimeout);
    self.clearTimeout(this.retryTimeout);
    if (loader) {
      loader.onreadystatechange = null;
      loader.onprogress = null;
      if (loader.readyState !== 4) {
        this.stats.aborted = true;
        loader.abort();
      }
    }
  }

  abort(): void {
    this.abortInternal();
    if (this.callbacks?.onAbort) {
      this.callbacks.onAbort(this.stats, this.context, this.loader);
    }
  }

  load(
    context: HlsTypes.LoaderContext,
    config: HlsTypes.LoaderConfiguration,
    callbacks: HlsTypes.LoaderCallbacks<HlsTypes.LoaderContext>
  ): void {
    if (this.stats.loading.start) {
      throw new Error('Loader can only be used once.');
    }
    this.stats.loading.start = self.performance.now();
    this.context = context;
    this.config = config;
    this.callbacks = callbacks;
    this.retryDelay = config.retryDelay;
    this.loadInternal();
  }

  loadInternal(): void {
    const { config, context } = this;
    if (!config) {
      return;
    }
    const xhr = (this.loader = new XMLHttpRequest());

    const stats = this.stats;
    stats.loading.first = 0;
    stats.loaded = 0;
    const xhrSetup = this.xhrSetup;

    try {
      if (xhrSetup) {
        try {
          xhrSetup(xhr, context.url, context.headers);
        } catch (e) {
          // fix xhrSetup: (xhr, url) => {xhr.setRequestHeader("Content-Language", "test");}
          // not working, as xhr.setRequestHeader expects xhr.readyState === OPEN
          xhr.open('GET', context.url, true);
          xhrSetup(xhr, context.url, context.headers);
        }
      }
      if (!xhr.readyState) {
        xhr.open('GET', context.url, true);
      }
      if (context.headers) {
        for (const header in context.headers) {
          xhr.setRequestHeader(header, context.headers[header]);
        }
      }
    } catch (e) {
      // IE11 throws an exception on xhr.open if attempting to access an HTTP resource over HTTPS
      this.callbacks!.onError({ code: xhr.status, text: e.message }, context, xhr);
      return;
    }

    if (context.rangeEnd) {
      xhr.setRequestHeader('Range', 'bytes=' + context.rangeStart + '-' + (context.rangeEnd - 1));
    }

    xhr.onreadystatechange = this.readystatechange.bind(this);
    xhr.onprogress = this.loadprogress.bind(this);
    xhr.responseType = context.responseType as XMLHttpRequestResponseType;
    // setup timeout before we perform request
    self.clearTimeout(this.requestTimeout);
    this.requestTimeout = self.setTimeout(this.loadtimeout.bind(this), config.timeout);
    xhr.send();
  }

  readystatechange(): void {
    const { context, loader: xhr, stats } = this;
    if (!context || !xhr) {
      return;
    }
    const readyState = xhr.readyState;
    const config = this.config as HlsTypes.LoaderConfiguration;

    // don't proceed if xhr has been aborted
    if (stats.aborted) {
      return;
    }

    // >= HEADERS_RECEIVED
    if (readyState >= 2) {
      // clear xhr timeout and rearm it if readyState less than 4
      self.clearTimeout(this.requestTimeout);
      if (stats.loading.first === 0) {
        stats.loading.first = Math.max(self.performance.now(), stats.loading.start);
      }

      if (readyState === 4) {
        xhr.onreadystatechange = null;
        xhr.onprogress = null;
        const status = xhr.status;
        // http status between 200 to 299 are all successful
        const isArrayBuffer = xhr.responseType === 'arraybuffer';
        if (status >= 200 && status < 300 && ((isArrayBuffer && xhr.response) || xhr.responseText !== null)) {
          stats.loading.end = Math.max(self.performance.now(), stats.loading.first);
          let data;
          let len: number;
          if (isArrayBuffer) {
            data = xhr.response;
            len = data.byteLength;
          } else {
            data = xhr.responseText;
            len = data.length;
          }
          stats.loaded = stats.total = len;

          if (!this.callbacks) {
            return;
          }
          const onProgress = this.callbacks.onProgress;
          if (onProgress) {
            onProgress(stats, context, data, xhr);
          }
          if (!this.callbacks) {
            return;
          }
          const response = {
            url: xhr.responseURL,
            data: data,
          };

          this.callbacks.onSuccess(response, stats, context, xhr);
        } else {
          // if max nb of retries reached or if http status between 400 and 499 (such error cannot be recovered, retrying is useless), return error
          if (stats.retry >= config.maxRetry || (status >= 400 && status < 499)) {
            this.callbacks!.onError({ code: status, text: xhr.statusText }, context, xhr);
          } else {
            // retry
            // abort and reset internal state
            this.abortInternal();
            this.loader = null;
            // schedule retry
            self.clearTimeout(this.retryTimeout);
            this.retryTimeout = self.setTimeout(this.loadInternal.bind(this), this.retryDelay);
            // set exponential backoff
            this.retryDelay = Math.min(2 * this.retryDelay, config.maxRetryDelay);
            stats.retry++;
          }
        }
      } else {
        // readyState >= 2 AND readyState !==4 (readyState = HEADERS_RECEIVED || LOADING) rearm timeout as xhr not finished yet
        self.clearTimeout(this.requestTimeout);
        this.requestTimeout = self.setTimeout(this.loadtimeout.bind(this), config.timeout);
      }
    }
  }

  loadtimeout(): void {
    const callbacks = this.callbacks;
    if (callbacks) {
      this.abortInternal();
      callbacks.onTimeout(this.stats, this.context, this.loader);
    }
  }

  loadprogress(event: ProgressEvent): void {
    const stats = this.stats;

    stats.loaded = event.loaded;
    if (event.lengthComputable) {
      stats.total = event.total;
    }
  }

  getCacheAge(): number | null {
    let result: number | null = null;
    if (this.loader && AGE_HEADER_LINE_REGEX.test(this.loader.getAllResponseHeaders())) {
      const ageHeader = this.loader.getResponseHeader('age');
      result = ageHeader ? parseFloat(ageHeader) : null;
    }
    return result;
  }
}
