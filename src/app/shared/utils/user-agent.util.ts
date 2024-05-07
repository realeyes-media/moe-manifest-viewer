import * as UAParser from 'ua-parser-js';

export interface IsResult {
  android: boolean;
  chrome: boolean;
  edge: boolean;
  firefox: boolean;
  ie: boolean;
  ios: boolean;
  mobile?: boolean;
  mobile_safari: boolean;
  opera: boolean;
  safari: boolean;
  webkit: boolean;
  ps4: boolean;
}

const { userAgent } = navigator;

export class UserAgentUtil {
  public static is: IsResult;
  public static browserVersion: string;
  public static osVersion: string;

  public static possibleNative: boolean;

  public static initialize() {
    const parsedUserAgent = new UAParser(userAgent);

    const isResponse: IsResult = {
      chrome: parsedUserAgent.getBrowser().name === 'Chrome',
      edge: parsedUserAgent.getBrowser().name === 'Edge',
      firefox: parsedUserAgent.getBrowser().name === 'Firefox',
      safari: parsedUserAgent.getBrowser().name === 'Safari',
      mobile_safari: parsedUserAgent.getBrowser().name === 'Mobile Safari',
      ie: parsedUserAgent.getBrowser().name === 'IE',
      opera: parsedUserAgent.getBrowser().name === 'Opera',
      webkit: parsedUserAgent.getEngine().name === 'WebKit',
      ios: parsedUserAgent.getOS().name === 'iOS',
      android: parsedUserAgent.getOS().name === 'Android',
      ...(userAgent.indexOf('PlayStation 4') !== -1
        ? {
            ps4: true,
          }
        : {
            ps4: false,
          }),
    };

    isResponse.mobile = isResponse.ios || isResponse.android || /webos|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());

    this.is = isResponse;
    this.browserVersion = parsedUserAgent.getBrowser().version;
    this.osVersion = parsedUserAgent.getOS().version;
    this.possibleNative = (this.is.safari && !this.is.chrome) || this.is.edge;
  }
}
UserAgentUtil.initialize();
