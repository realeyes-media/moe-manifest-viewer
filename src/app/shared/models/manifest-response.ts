export interface ManifestResponse {
  text?: string;
  status?: number;
  statusText?: string;
  type?: string;
  url: string;
}

export type ErrorTypes = null | 'generalLoadError' | 'mixedContentError';
