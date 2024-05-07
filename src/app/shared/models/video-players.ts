export enum VideoPlayers {
  HLS_PLAYER = 'hls',
  DASH_PLAYER = 'dash',
  SHAKA_PLAYER = 'shaka',
  NONE = 'unknown',
}

export const getVideoPlayerTitle = (type: VideoPlayers) => {
  switch (type) {
    case VideoPlayers.HLS_PLAYER:
      return 'HLS.js Player';
      break;
    case VideoPlayers.DASH_PLAYER:
      return 'Dash.js Player';
      break;
    case VideoPlayers.SHAKA_PLAYER:
      return 'Shaka Player';
      break;
    default:
      return ' ';
      break;
  }
};

export type VideoSourceType = 'hls' | 'dash' | 'vtt' | 'unknown';

export const getVideoPlayerType = (type: VideoSourceType) => {
  switch (type) {
    case 'hls':
      return VideoPlayers.HLS_PLAYER;
      break;
    case 'dash':
      return VideoPlayers.DASH_PLAYER;
      break;
    default:
      return VideoPlayers.NONE;
      break;
  }
};
