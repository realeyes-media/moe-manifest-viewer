export enum DashEvents {
  AST_IN_FUTURE = 'astInFuture',
  BUFFER_EMPTY = 'bufferStalled',
  BUFFER_LEVEL_STATE_CHANGED = 'bufferStateChanged',
  BUFFER_LOADED = 'bufferLoaded',
  CAN_PLAY = 'canPlay',
  ERROR = 'error',
  FRAGMENT_LOADING_ABANDONED = 'fragmentLoadingAbandoned',
  FRAGMENT_LOADING_COMPLETED = 'fragmentLoadingCompleted',
  FRAGMENT_LOADING_STARTED = 'fragmentLoadingStarted',
  KEY_ADDED = 'public_keyAdded',
  KEY_ERROR = 'public_keyError',
  KEY_MESSAGE = 'public_keyMessage',
  KEY_SESSION_CLOSED = 'public_keySessionClosed',
  KEY_SESSION_CREATED = 'public_keySessionCreated',
  KEY_SESSION_REMOVED = 'public_keySessionRemoved',
  KEY_STATUSES_CHANGED = 'public_keyStatusesChanged',
  KEY_SYSTEM_SELECTED = 'public_keySystemSelected',
  LICENSE_REQUEST_COMPLETE = 'public_licenseRequestComplete',
  LOG = 'log',
  MANIFEST_LOADED = 'manifestLoaded',
  METRICS_CHANGED = 'metricsChanged',
  METRIC_ADDED = 'metricAdded',
  METRIC_CHANGED = 'metricChanged',
  METRIC_UPDATED = 'metricUpdated',
  PERIOD_SWITCH_COMPLETED = 'periodSwitchCompleted',
  PERIOD_SWITCH_STARTED = 'periodSwitchStarted',
  PLAYBACK_ENDED = 'playbackEnded',
  PLAYBACK_ERROR = 'playbackError',
  PLAYBACK_METADATA_LOADED = 'playbackMetaDataLoaded',
  PLAYBACK_NOT_ALLOWED = 'playbackNotAllowed',
  PLAYBACK_PAUSED = 'playbackPaused',
  PLAYBACK_PLAYING = 'playbackPlaying',
  PLAYBACK_PROGRESS = 'playbackProgress',
  PLAYBACK_RATE_CHANGED = 'playbackRateChanged',
  PLAYBACK_SEEKED = 'playbackSeeked',
  PLAYBACK_SEEKING = 'playbackSeeking',
  PLAYBACK_STARTED = 'playbackStarted',
  PLAYBACK_TIME_UPDATED = 'playbackTimeUpdated',
  PROTECTION_CREATED = 'public_protectioncreated',
  PROTECTION_DESTROYED = 'public_protectiondestroyed',
  TRACK_CHANGE_RENDERED = 'trackChangeRendered',
  QUALITY_CHANGE_RENDERED = 'qualityChangeRendered',
  QUALITY_CHANGE_REQUESTED = 'qualityChangeRequested',
  STREAM_INITIALIZED = 'streamInitialized',
  TEXT_TRACKS_ADDED = 'allTextTracksAdded',
  TEXT_TRACK_ADDED = 'textTrackAdded',
  TTML_PARSED = 'ttmlParsed',
}

export const DashSCTEEvents = ['urn:scte:scte35:2013:xml', 'urn:scte:scte35:2014:xml', 'urn:scte:scte35:2014:xml+bin'];
