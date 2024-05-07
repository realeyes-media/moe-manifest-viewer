export const PDT_REGEX = /#EXT-X-PROGRAM-DATE-TIME:(.+)/;
export const MEDIA_SEQUENCE_REGEX = /#EXT-X-MEDIA-SEQUENCE:(\d+)/;
export const MEDIA_TAG_REGEX = /#EXT-X-MEDIA:(.+)/;
export const IGNORE_MEDIA_TAG: RegExp = /#EXT-X-MEDIA:(.+AUDIO|.+SUBTITLES)/;
export const IFRAME_REGEX = /#EXT-X-I-FRAME-STREAM-INF:(.+)/;
export const AD_CUE_REGEX = /#EXT-X-CUE-OUT:[0-9]+(.*)/;
export const TARGET_DURATION_REGEX = /#EXT-X-TARGETDURATION:(\d+)/;
export const DISCONTINUITY_REGEX = /(#EXT-X-DISCONTINUITY.*)/; // matches all, including DISCONTINUITY-SEQUENCE:
export const SCTE_CUE_REGEX = /#EXT-X-SCTE35:CUE=(.+)/g;
export const SCTE_DATERANGE_REGEX = /#EXT-X-DATERANGE:(.+)/g;
export const GENERIC_CUE_REGEX = /#EXT-X-CUE:(.+)/g;

export const ENDLIST_REGEX = /(#EXT-X-ENDLIST)/;
export const DURATION_REGEX: RegExp = /#EXTINF:(\d+\.\d+|\d+(?!\.))/;
export const BANDWIDTH_REGEX: RegExp = /.+(?:(?::|,)BANDWIDTH=(\d+))|(?:BANDWIDTH=(\d+)),/;
export const MATCHES_PATH: RegExp = /[^#]+(\.ts|\.m4s|\.mp4|\.m3u8|\.webvtt|\.vtt|\.mp3|(\?*(format)=(m3u8|mp4|mpeg4)*))|(\?.+)?$/;
export const SEGMENT_MATCH: RegExp = /(?:\.ts|\.m4s|\.mp4|\.mp3)(\?.+)?$/g;
export const LAST_FRAGMENT_REGEX = /(.+\.ts|\.m4s|\.mp4|\.mp3)(?![\s\S]*\.ts)/g;
export const HlsParsingRegex: RegExp = new RegExp(
  [
    `${SCTE_CUE_REGEX.source}`,
    `${SCTE_DATERANGE_REGEX.source}`,
    `${MEDIA_TAG_REGEX.source}`,
    `${IFRAME_REGEX.source}`,
    `${TARGET_DURATION_REGEX.source}`,
    `${DURATION_REGEX.source}`,
    `${MEDIA_SEQUENCE_REGEX.source}`,
    `${PDT_REGEX.source}`,
    `${DISCONTINUITY_REGEX.source}`,
    `${BANDWIDTH_REGEX.source}`,
    `${AD_CUE_REGEX.source}`,
    `${MATCHES_PATH.source}`,
    `${GENERIC_CUE_REGEX.source}`,
  ].join('|')
);

export const ATTR_LIST_REGEX = /\s*(.+?)\s*=((?:\".*?\")|.*?)(?:,|$)/g;

export interface HlsAttributes {
  AUTOSELECT?: string;
  'GROUP-ID'?: string;
  LANGUAGE?: string;
  NAME?: string;
  TYPE?: string;
  URI?: string;
  DEFAULT?: string;
  'INSTREAM-ID'?: string;
  'AVERAGE-BANDWIDTH'?: number;
  BANDWIDTH?: number;
  CODECS?: string;
  RESOLUTION?: string;
}
