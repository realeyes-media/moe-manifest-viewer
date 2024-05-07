import { Injectable } from '@angular/core';
import { ManifestLineObject, StreamInfo, ParsedManifest } from '../models/manifest-line-object';
import { HlsParsingRegex, HlsAttributes, SEGMENT_MATCH, ATTR_LIST_REGEX } from '../models/hls-regex.model';
import { ManifestResponse } from '../models/manifest-response';
import { scte35Types, SCTE35Type, SCTE35Data, SCTE35DataTypes } from '../models/sctce35Types';

@Injectable()
export class ParserService {
  private static FORMAT_REGEX: RegExp = /(\#EXTM3U)|(\<MPD)|(WEBVTT)/;
  private MEDIA_SEQUENCE: RegExp = /#EXT-X-MEDIA-SEQUENCE:(\d+)/g;

  public fragDuration: number;
  public streamInfo: StreamInfo;
  public urlPath: URL;
  private mediaSequence: number;

  constructor() {}

  public getBaseUrl(url: string): string {
    const urlObj = new URL(url);
    this.urlPath = urlObj;
    return urlObj.origin + urlObj.pathname;
  }

  public getUrlParams(url: string): string {
    return (url && url.split(/\?(.*)/)[1]) || '';
  }

  // For Dash MPD tag may not always be the first line

  public getManifestType(text: string): 'hls' | 'dash' | 'vtt' | 'unknown' {
    const results: Array<string> | null = ParserService.FORMAT_REGEX.exec(text!);
    if (results && results[0] === '#EXTM3U') {
      return 'hls';
    } else if (results && results[0] === '<MPD') {
      return 'dash';
    } else if (results && results[0] === 'WEBVTT') {
      return 'vtt';
    } else {
      return 'unknown';
    }
  }

  public parseManifest = async (manifestResponse: ManifestResponse): Promise<ParsedManifest> => {
    const type = this.getManifestType(manifestResponse.text!);
    const baseUrl = this.getManifestUrlBase(manifestResponse.url);
    const params = this.getUrlParams(manifestResponse.url);
    return new Promise<ParsedManifest>((resolve, reject: (reason: Error) => void) => {
      switch (type) {
        case 'hls':
          resolve(this.parseHlsManifest(manifestResponse.text || '', baseUrl, params, manifestResponse.url));
          break;
        case 'dash':
          resolve(this.parseDashManifest(manifestResponse.text || '', baseUrl, params, manifestResponse.url));
          break;
        case 'vtt':
          resolve(this.parseVttManifest(manifestResponse.text || '', baseUrl, params, manifestResponse.url));
          break;
        default:
          reject(new Error('Input must be Dash or Hls Manifest'));
          break;
      }
    });
  };

  private parseVttManifest(manifest: string, baseUrl: string, params: string, fullUrl: string): ParsedManifest {
    const lines: Array<string> = manifest.split('\n');
    const result: ManifestLineObject[] = [];
    const info: StreamInfo = {};
    info.type = 'vod';
    info.level = 'master';
    this.streamInfo = info;
    let url;

    params = typeof params !== 'string' ? '' : params;

    lines.forEach((v: string, i: number, a: Array<string>) => {
      url = this.generateUrl(v, baseUrl, params);
      result.push({
        str: v,
        stream: true,
        url: '',
        status: undefined,
        size: undefined,
        time: undefined,
        highlight: false,
      });
    });

    return { lines: result, info: info, manifest: manifest, url: fullUrl };
  }

  private parseDashManifest(manifest: string, baseUrl: string, params: string, fullUrl: string): ParsedManifest {
    const strings: Array<string> = manifest.split('\n');
    const result: ManifestLineObject[] = [];
    const info: StreamInfo = {};
    info.type = manifest.indexOf('type="dynamic"') > -1 ? 'live' : 'vod';
    info.level = 'master';
    this.streamInfo = info;
    let url;

    params = typeof params !== 'string' ? '' : params;

    strings.forEach((v: string, i: number, a: Array<string>) => {
      url = this.generateUrl(v, baseUrl, params);
      result.push({
        str: v,
        stream: false,
        url: url,
        status: undefined,
        size: undefined,
        time: undefined,
        highlight: false,
      });
    });

    return { lines: result, info: info, manifest: manifest, url: fullUrl };
  }

  private parseHlsManifest(manifest: string, baseUrl: string, params: string, fullUrl: string): ParsedManifest {
    const allLines = manifest.split('\n');
    const dataLines: ManifestLineObject[] = [];
    const info: StreamInfo = {};
    const newParams = '?' + params;
    if (manifest.indexOf('#EXTINF:') > 0 || manifest.indexOf('#EXT-X-TARGETDURATION:') > 0) {
      info.level = 'stream';
    } else {
      info.level = 'master';
      info.levelUrls = [];
    }
    if (info.level === 'stream') {
      info.type = manifest.indexOf('#EXT-X-ENDLIST') > -1 ? 'vod' : 'live';
    }
    this.streamInfo = info;
    let lastDuration = -1;
    let currentBandwidth = '';
    allLines.forEach((eachLine: string) => {
      eachLine = eachLine.trim();
      const result = HlsParsingRegex.exec(eachLine) || [];
      const [
        fullLine,
        scteCueData,
        scteDaterangeData,
        mediaTag,
        iframeTag,
        targetDuration,
        duration,
        mediaSequence,
        pdt,
        discontinuity,
        bandwidth,
        ,
        adCue,
        pathMatch,
      ] = result;
      const otherCueData = result[result.length - 1];
      let baseObj: ManifestLineObject = {
        str: eachLine,
        stream: false,
      };
      if (pathMatch && eachLine[0] !== '#') {
        const [, isMediaSequence = '-1'] = this.MEDIA_SEQUENCE.exec(manifest) || [];
        const mediaSequenceNumber = parseInt(isMediaSequence, 10);
        if (info.type === 'live') {
          this.mediaSequence = !this.mediaSequence ? mediaSequenceNumber : this.mediaSequence;
          info.isDVR = this.mediaSequence !== undefined && this.mediaSequence !== mediaSequenceNumber;
        }
        const startTime = info.duration && info.duration > -1 && lastDuration > -1 ? info.duration - lastDuration : undefined;
        const url = this.generateUrl(eachLine, baseUrl, newParams);
        baseObj = {
          ...baseObj,
          stream: true,
          url: url,
          startTime: startTime,
          fragDuration: lastDuration,
          highlight: false,
          bandwidth: currentBandwidth,
        };
        this.fragDuration = Number(baseObj.fragDuration);
        if (eachLine.match(SEGMENT_MATCH)) {
          if (!info.segmentUrls) {
            info.segmentUrls = [];
          }
          info.segmentUrls.push(url);
        }
        if (info.level === 'master') {
          if (!info.levelUrls) {
            info.levelUrls = [];
          }
          info.levelUrls.push(url);
        }
      } else if (duration) {
        baseObj = {
          ...baseObj,
          startTime: info.duration,
        };
        info.duration = (info.duration || 0) + Number(duration);
        lastDuration = Number(duration);
      } else if (bandwidth) {
        currentBandwidth = bandwidth;
      } else if (discontinuity) {
        if (!info.discontinuities) {
          info.discontinuities = [{ time: info.duration || 0, text: discontinuity }];
        } else {
          info.discontinuities.push({ time: info.duration || 0, text: discontinuity });
        }
        baseObj = {
          ...baseObj,
          startTime: info.duration || 0,
          str: discontinuity,
        };
      } else if (adCue) {
        if (!info.ads) {
          info.ads = [{ time: info.duration || 0, text: eachLine }];
        } else {
          info.ads.push({ time: info.duration || 0, text: eachLine });
        }
        baseObj = {
          ...baseObj,
          startTime: info.duration || 0,
          str: eachLine,
        };
      } else if (mediaTag || iframeTag) {
        const tag = mediaTag || iframeTag;
        const attributes = this.getLineAttributes(tag);
        if (attributes.URI) {
          const url = this.generateUrl(attributes.URI, baseUrl, newParams);
          baseObj = {
            ...baseObj,
            media: true,
            attributes: attributes,
            url: url,
          };
          if (info.level === 'master') {
            if (!info.levelUrls) {
              info.levelUrls = [];
            }
            info.levelUrls.push(url);
          }
          if (attributes.TYPE === 'SUBTITLES') {
            const name = attributes.NAME ?? '';
            if (!info.subtitles) {
              info.subtitles = [];
            }
            info.subtitles.push({ name, url });
          }
        }
      } else if (pdt) {
        const date = new Date(pdt);
        const time = date.getTime() / 1000;
        const currentPdt = time.toString();
        const displayText = currentPdt;
        if (!info.pdt) {
          info.pdt = [{ time: info.duration || 0, text: eachLine, displayText: displayText }];
        } else {
          info.pdt.push({ time: info.duration || 0, text: eachLine, displayText: displayText });
        }
        baseObj = {
          ...baseObj,
          startTime: info.duration || 0,
          str: eachLine,
        };
      } else if (scteCueData || scteDaterangeData) {
        let scteData = scteCueData;
        let scteDataType = SCTE35DataTypes.SCTE35_CUE;
        if (scteDaterangeData) {
          scteData = scteDaterangeData;
          scteDataType = SCTE35DataTypes.SCTE35_DATERANGE;
        }
        baseObj = {
          ...baseObj,
          startTime: info.duration || 0,
          scteData: this.parseStce35Data(scteData, scteDataType),
        };
      } else if (otherCueData && otherCueData.includes('TYPE="scte35"')) {
        baseObj = {
          ...baseObj,
          startTime: info.duration || 0,
          scteData: this.parseOtherStce35Data(otherCueData),
        };
      }
      dataLines.push(baseObj);
    });
    return { lines: dataLines, info: info, manifest: manifest, url: fullUrl };
  }

  private getManifestUrlBase(url: string): string {
    const base = this.getBaseUrl(url);
    return base.substring(0, base.lastIndexOf('/'));
  }

  private getLineAttributes = (line: string): HlsAttributes => {
    let match;
    const attrs: HlsAttributes = {};
    const quote = '"';
    ATTR_LIST_REGEX.lastIndex = 0;
    while ((match = ATTR_LIST_REGEX.exec(line)) !== null) {
      let value = match[2];
      if (value.indexOf(quote) === 0 && value.lastIndexOf(quote) === value.length - 1) {
        value = value.slice(1, -1);
      }

      attrs[match[1]] = value;
    }
    return attrs;
  };

  private generateUrl(value, baseUrl, params): string {
    if (value.indexOf('http') !== 0) {
      const manifestBase = (value.indexOf('/') === 0 ? new URL(baseUrl).origin : baseUrl + '/') + value;
      return manifestBase + (value.indexOf(params) < 0 ? params : '');
    }
    return value + params;
  }

  private getAttribute(attribute: string, data: string[], scteDataType?: string) {
    let SCTE_PARSE_REGEX = /"([^"])"+/g;
    if (scteDataType == SCTE35DataTypes.SCTE35_DATERANGE) {
      SCTE_PARSE_REGEX = /"([^"]+)"/g;
    }
    let value;
    const currentAttribute = data.find((currentAttr) => currentAttr.includes(`${attribute}`));
    if (currentAttribute !== undefined) {
      if (currentAttribute.includes('"')) {
        value = (SCTE_PARSE_REGEX.exec(currentAttribute) || []).pop();
      } else {
        value = currentAttribute.split('=').pop();
      }
    }
    return value;
  }

  private getSCTE35Type(stceValue: string): SCTE35Type | undefined {
    const scteDecimalValue = parseInt(stceValue.split('x').pop()!, 16);
    return scte35Types.find(({ typeValue }) => typeValue === scteDecimalValue);
  }

  private parseStce35Data(line: string, scteDataType: string): SCTE35Data {
    const data = line.split(',');
    let parsedData = {
      id: this.getAttribute('ID', data, scteDataType),
      time: this.getAttribute('TIME', data, scteDataType),
      duration: this.getAttribute('DURATION', data, scteDataType),
      elapsed: this.getAttribute('ELAPSED', data, scteDataType),
      upid: this.getAttribute('UPID', data, scteDataType),
      blackout: this.getAttribute('BLACKOUT', data, scteDataType),
      segne: this.getAttribute('SEGNE', data, scteDataType),
      scte35Out: this.getAttribute('SCTE35-OUT', data, scteDataType), // cambiar valor suerto por valor de una lista
      scte35Cmd: this.getAttribute('SCTE35-CMD', data, scteDataType),
      startDate: this.getAttribute('START-DATE', data, scteDataType),
      endDate: this.getAttribute('END-DATE', data, scteDataType),
      plannedDuration: this.getAttribute('PLANNED-DURATION', data, scteDataType),
    };
    if (scteDataType == SCTE35DataTypes.SCTE35_CUE) {
      const SCTE_DATA_REGEX = /"([^"]+)",/g;
      const scteData = SCTE_DATA_REGEX.exec(line) || [];
      const currentType = line.includes('TYPE=') ? this.getSCTE35Type(this.getAttribute('TYPE', data, scteDataType)) : undefined;
      parsedData['data'] = scteData[1];
      parsedData['type'] = currentType !== undefined ? currentType.type : undefined;
    }
    return parsedData;
  }

  /**
   * This is a wrapper for parsing STCE-35 data of a diffrent type
   * See ticket MM-572 for more details
   */
  private parseOtherStce35Data(line: string): SCTE35Data {
    const getAttribute = (attribute: string, data: string[]) => {
      let value;
      const currentAttribute = data.find((currentAttr) => currentAttr.includes(`${attribute}`));
      if (currentAttribute !== undefined) {
        value = currentAttribute.replace('=', '>>>').split('>>>')[1].replace(/"/g, '');
      }
      return value;
    };

    const allData = line.split(',');
    return {
      data: getAttribute(SCTE35DataTypes.SCTE35_CUE, allData),
      id: getAttribute('ID', allData),
      type: undefined,
      time: getAttribute('TIME', allData),
      duration: getAttribute('DURATION', allData),
      elapsed: getAttribute('ELAPSED', allData),
      upid: getAttribute('UPID', allData),
      blackout: getAttribute('BLACKOUT', allData),
      segne: getAttribute('SEGNE', allData),
      xProgramTimePosition: getAttribute('X-PROGRAM-TIME-POSITION', allData),
      xAssetId: getAttribute('X-ASSET-ID', allData),
      xSlotId: getAttribute('X-SLOT-ID', allData),
    };
  }
}
