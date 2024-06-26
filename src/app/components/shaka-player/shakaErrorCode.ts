export enum ShakaErrorCode {
  '8002.0' = 'ALREADY_CASTING',
  '1010.0' = 'ATTEMPTS_EXHAUSTED',
  '2004.0' = 'BAD_ENCODING',
  '1001.0' = 'BAD_HTTP_STATUS',
  '3000.0' = 'BUFFER_READ_OUT_OF_BOUNDS',
  '4033.0' = 'CANNOT_ADD_EXTERNAL_TEXT_TO_LIVE_STREAM',
  '9005.0' = 'CANNOT_STORE_LIVE_OFFLINE',
  '8000.0' = 'CAST_API_UNAVAILABLE',
  '8004.0' = 'CAST_CANCELED_BY_USER',
  '8005.0' = 'CAST_CONNECTION_TIMED_OUT',
  '8006.0' = 'CAST_RECEIVER_APP_UNAVAILABLE',
  '3019.0' = 'CONTENT_TRANSFORMATION_FAILED',
  '4032.0' = 'CONTENT_UNSUPPORTED_BY_BROWSER',
  '10001.0' = 'CS_AD_MANAGER_NOT_INITIALIZED',
  '10000.0' = 'CS_IMA_SDK_MISSING',
  '10004.0' = 'CURRENT_DAI_REQUEST_NOT_FINISHED',
  '4010.0' = 'DASH_CONFLICTING_KEY_IDS',
  '4018.0' = 'DASH_DUPLICATE_REPRESENTATION_ID',
  '4003.0' = 'DASH_EMPTY_ADAPTATION_SET',
  '4004.0' = 'DASH_EMPTY_PERIOD',
  '4001.0' = 'DASH_INVALID_XML',
  '4009.0' = 'DASH_MULTIPLE_KEY_IDS_NOT_SUPPORTED',
  '4008.0' = 'DASH_NO_COMMON_KEY_SYSTEM',
  '4002.0' = 'DASH_NO_SEGMENT_INFO',
  '4007.0' = 'DASH_PSSH_BAD_ENCODING',
  '4006.0' = 'DASH_UNSUPPORTED_CONTAINER',
  '4027.0' = 'DASH_UNSUPPORTED_XLINK_ACTUATE',
  '4005.0' = 'DASH_WEBM_MISSING_INIT',
  '4028.0' = 'DASH_XLINK_DEPTH_LIMIT',
  '9002.0' = 'DEPRECATED_OPERATION_ABORTED',
  '3003.0' = 'EBML_BAD_FLOATING_POINT_SIZE',
  '3002.0' = 'EBML_OVERFLOW',
  '6010.0' = 'ENCRYPTED_CONTENT_WITHOUT_DRM_INFO',
  '6014.0' = 'EXPIRED',
  '6003.0' = 'FAILED_TO_ATTACH_TO_VIDEO',
  '6002.0' = 'FAILED_TO_CREATE_CDM',
  '6005.0' = 'FAILED_TO_CREATE_SESSION',
  '6006.0' = 'FAILED_TO_GENERATE_LICENSE_REQUEST',
  '4034.0' = 'HLS_AES_128_ENCRYPTION_NOT_SUPPORTED',
  '4025.0' = 'HLS_COULD_NOT_GUESS_CODECS',
  '4021.0' = 'HLS_COULD_NOT_GUESS_MIME_TYPE',
  '4030.0' = 'HLS_COULD_NOT_PARSE_SEGMENT_START_TIME',
  '4035.0' = 'HLS_INTERNAL_SKIP_STREAM',
  '4017.0' = 'HLS_INVALID_PLAYLIST_HIERARCHY',
  '4026.0' = 'HLS_KEYFORMATS_NOT_SUPPORTED',
  '4022.0' = 'HLS_MASTER_PLAYLIST_NOT_PROVIDED',
  '4020.0' = 'HLS_MULTIPLE_MEDIA_INIT_SECTIONS_FOUND',
  '4015.0' = 'HLS_PLAYLIST_HEADER_MISSING',
  '4023.0' = 'HLS_REQUIRED_ATTRIBUTE_MISSING',
  '4024.0' = 'HLS_REQUIRED_TAG_MISSING',
  '4039.0' = 'HLS_VARIABLE_NOT_FOUND',
  '1002.0' = 'HTTP_ERROR',
  '4038.0' = 'INCONSISTENT_DRM_ACROSS_PERIODS',
  '9001.0' = 'INDEXED_DB_ERROR',
  '6016.0' = 'INIT_DATA_TRANSFORM_ERROR',
  '4016.0' = 'INVALID_HLS_TAG',
  '2007.0' = 'INVALID_MP4_TTML',
  '2008.0' = 'INVALID_MP4_VTT',
  '6004.0' = 'INVALID_SERVER_CERTIFICATE',
  '2001.0' = 'INVALID_TEXT_CUE',
  '2000.0' = 'INVALID_TEXT_HEADER',
  '2005.0' = 'INVALID_XML',
  '3001.0' = 'JS_INTEGER_OVERFLOW',
  '9012.0' = 'KEY_NOT_FOUND',
  '6007.0' = 'LICENSE_REQUEST_FAILED',
  '6008.0' = 'LICENSE_RESPONSE_REJECTED',
  '7000.0' = 'LOAD_INTERRUPTED',
  '9008.0' = 'LOCAL_PLAYER_INSTANCE_REQUIRED',
  '1004.0' = 'MALFORMED_DATA_URI',
  '9004.0' = 'MALFORMED_OFFLINE_URI',
  '1008.0' = 'MALFORMED_TEST_URI',
  '3014.0' = 'MEDIA_SOURCE_OPERATION_FAILED',
  '3015.0' = 'MEDIA_SOURCE_OPERATION_THREW',
  '9013.0' = 'MISSING_STORAGE_CELL',
  '3005.0' = 'MP4_SIDX_INVALID_TIMESCALE',
  '3006.0' = 'MP4_SIDX_TYPE_NOT_SUPPORTED',
  '3004.0' = 'MP4_SIDX_WRONG_BOX_TYPE',
  '9011.0' = 'NEW_KEY_OPERATION_NOT_SUPPORTED',
  '8001.0' = 'NO_CAST_RECEIVERS',
  '9007.0' = 'NO_INIT_DATA_FOR_OFFLINE',
  '6012.0' = 'NO_LICENSE_SERVER_GIVEN',
  '6000.0' = 'NO_RECOGNIZED_KEY_SYSTEMS',
  '4036.0' = 'NO_VARIANTS',
  '7002.0' = 'NO_VIDEO_ELEMENT',
  '7003.0' = 'OBJECT_DESTROYED',
  '6013.0' = 'OFFLINE_SESSION_REMOVED',
  '7001.0' = 'OPERATION_ABORTED',
  '4037.0' = 'PERIOD_FLATTENING_FAILED',
  '3017.0' = 'QUOTA_EXCEEDED_ERROR',
  '9003.0' = 'REQUESTED_ITEM_NOT_FOUND',
  '6001.0' = 'REQUESTED_KEY_SYSTEM_CONFIG_UNAVAILABLE',
  '1006.0' = 'REQUEST_FILTER_ERROR',
  '1007.0' = 'RESPONSE_FILTER_ERROR',
  '4012.0' = 'RESTRICTIONS_CANNOT_BE_MET',
  '6015.0' = 'SERVER_CERTIFICATE_REQUIRED',
  '10003.0' = 'SS_AD_MANAGER_NOT_INITIALIZED',
  '10002.0' = 'SS_IMA_SDK_MISSING',
  '9000.0' = 'STORAGE_NOT_SUPPORTED',
  '5006.0' = 'STREAMING_ENGINE_STARTUP_INVALID_STATE',
  '1003.0' = 'TIMEOUT',
  '3018.0' = 'TRANSMUXING_FAILED',
  '2003.0' = 'UNABLE_TO_DETECT_ENCODING',
  '2009.0' = 'UNABLE_TO_EXTRACT_CUE_START_TIME',
  '4000.0' = 'UNABLE_TO_GUESS_MANIFEST_TYPE',
  '8003.0' = 'UNEXPECTED_CAST_ERROR',
  '1009.0' = 'UNEXPECTED_TEST_REQUEST',
  '1000.0' = 'UNSUPPORTED_SCHEME',
  '3016.0' = 'VIDEO_ERROR',
  '3007.0' = 'WEBM_CUES_ELEMENT_MISSING',
  '3013.0' = 'WEBM_CUE_TIME_ELEMENT_MISSING',
  '3012.0' = 'WEBM_CUE_TRACK_POSITIONS_ELEMENT_MISSING',
  '3011.0' = 'WEBM_DURATION_ELEMENT_MISSING',
  '3008.0' = 'WEBM_EBML_HEADER_ELEMENT_MISSING',
  '3010.0' = 'WEBM_INFO_ELEMENT_MISSING',
  '3009.0' = 'WEBM_SEGMENT_ELEMENT_MISSING',
}
