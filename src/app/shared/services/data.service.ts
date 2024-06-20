import { Injectable } from '@angular/core';
import { ManifestResponse } from '../';

@Injectable()
export class DataService {
  constructor() {}

  public async getManifest(url: string, options?: RequestInit): Promise<ManifestResponse> {
    let fetchResponse: Response;
    options = {
      ...options,
      cache: 'no-store',
    };
    return fetch(url, options)
      .catch((response) => {
        throw {
          text: response.message,
          status: 0,
          statusText: response.message,
          url: url,
        };
      })
      .then((response: Response) => {
        if (!response.ok) {
          throw {
            text: response.statusText || 'Unknown',
            status: response.status || 0,
            statusText: response.statusText || 'Unknown',
            type: response.type,
            url: url,
          };
        }
        fetchResponse = response;
        return response.text();
      })
      .then((manifestText: string) => {
        return {
          text: manifestText,
          status: fetchResponse.status,
          statusText: fetchResponse.statusText || '',
          type: fetchResponse.type,
          url: url,
        };
      });
  }
}
