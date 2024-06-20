export enum CMCDTransitionModes {
  HEADER = 'header',
  QUERY = 'query',
}

export const CMCDHeaders = ['CMCD-Object', 'CMCD-Request', 'CMCD-Session', 'CMCD-Status'];

const CMCD = 'CMCD';

export class CMCDFilter {
  private params: URLSearchParams;
  private url: string;

  constructor(url?: string) {
    if (url) {
      this.url = url;
      this.params = new URLSearchParams(url.split('?')[1]);
    }
  }

  public getCMCDValues(): string[] {
    const cmcdValues = decodeURIComponent(this.params.get(CMCD) ?? '').split(',');
    return cmcdValues;
  }

  public getCMCDFilteredKeyPairs(requiredKeys: string[], keyValuesPairs: string[]): string[] {
    const filteredKeyPairs: string[] = [];
    keyValuesPairs.forEach((keyValuesPair) => {
      const key = keyValuesPair.split('=')[0];
      if (requiredKeys.includes(key)) {
        filteredKeyPairs.push(keyValuesPair);
      }
    });
    return filteredKeyPairs;
  }

  public createNewFilteredUrl(filteredCmcdValues: string[]): string {
    this.params.delete(CMCD);
    if (filteredCmcdValues.length > 0) {
      filteredCmcdValues.forEach((cmcdValue: string) => {
        this.params.append(CMCD, cmcdValue);
      });
    }
    const stringParams = this.params.toString();
    const url = stringParams ? this.url.split('?')[0] + '?' + stringParams : this.url.split('?')[0];
    return url;
  }

  public removeCMCDParam(): URLSearchParams {
    this.params.delete(CMCD);
    return this.params;
  }

  public getCMCDHeader(headerValue: string | null, requiredKeys: string[]): string {
    return headerValue ? this.getCMCDFilteredKeyPairs(requiredKeys, headerValue.split(',')).join(',') : '';
  }
}

export default CMCDFilter;
