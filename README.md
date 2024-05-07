# MOE: Viewer

Built with Angular (v6 > v9)
**Note:** Project requires Node 14.x.

### About

MOE: Viewer can display the manifest from a hls or dash streaming video file, analyze the manifest and play it, all in one place.

---

### Usage

#### Options

Various options can be used to customize how a manifest is seen, and can be configured from the query parameters of the app:

- Show Video `&showVideo=1` - plays the manifest in the browser's native video player using either hls.js, dash.js or native browser playback. On browsers where native playback is supported like safari or edge, the option to us hls.js or native will be present
- Show Metrics `&showMetrics=1` - displays information such as number of frags, duration, discontinuities, and video information such as buffer, errors, and current time
- XHR Credentials `&xhrCredentials=1` - adds the withCredentials attribute on the xmlHTTPRequests for manifests
- Mute Video `&muted=1` - mutes all viewers by default when the video is showing
- Automatic Polling `&automaticPolling=1` - polls the manifest in the viewer every `x` seconds where `x` is the pollInterval
- Poll Interval `&pollInterval=4` - interval to poll when Automatic Polling is turned on, in seconds
- Show Stall Detector `&showStallDetector=1` - shows the stall detector in metric container
- Global Token `&globalToken=1` - appends the stored global token to manifest requests. Token can be set from the options modal
- Use Hls.js `&useHlsjs=1` - turns on hls.js for Safari and Edge.
- Show Player Logs `&showPlayerLogs=1` - shows Hls Logs in metric container

#### Query Parameters

The following can be added to a url, in addition to the ones above.

- Scrolling `&scrolling=tailManifest` - sets the behavior of the scrolling of a viewer. Possible values are:
  - `autoScroll` - will follow the video and scroll to the currently playing fragment
  - `tailManifest` - will scroll to bottom of manifest and stay when live manifest updates
  - `none` - no automatic scrolling
- Manifest Url `&url=http%3A%2F%2Fstream.m3u8` - URI encoded url to load initially
- RE Live Manifester `&relm=1` - shows the button to load a manifest in relm
- Hls.js Version `&hlsjsVersion=0.14.17` - loads the specified version of hls.js. Possible values are a specific version (e.g. `0.14.17`), `latest`, or `canary`. Defaults to `0.14.17` and falls back to `0.14.17` if the version provided doesn't work
- Dash.js Version `&dashjsVersion=3.2.0` - loads the specified version of dash.js. Possible values are a specific version (e.g. `3.2.0`), or `latest`. Defaults to `latest` and falls back to `latest` if the version provided doesn't work
- Hls.js config `&hlsjs.debug=false` - sets options for hls.js that are applied to the video. `false/true` will be interpreted as booleans, all others will be converted to numbers.
- Shaka.js (UI) Version `&shakajsVersion=3.0.10` - loads the specified version of shaka.js. Possible values are a specific version (e.g. `3.2.0`), or `latest`. Defaults to `3.2.0` and falls back to `3.2.0` if the version provided doesn't work
- Shaka.js (UI) Debug Version `&shakajsDebugVersion=3.0.10` - loads the specified version of shaka.js Debug. Possible values are a specific version (e.g. `3.2.0`), or `latest`. Defaults to `3.2.0` and falls back to `3.2.0` if the version provided doesn't work
- Auto Load Manifest `&autoLoad=1` - This will load the provided url and skip the options modal. **Note**: this requires the url to be in the query params as well. e.g `&url=http%3A%2F%2Fstream.m3u8&autoLoad=1`

Example url:
`http://localhost:9000/?showVideo=1&showMetrics=1&hlsjsVersion=canary&url=http%3A%2F%2Fwww.streambox.fr%2Fplaylists%2Fx212fsj%2Fx212fsj.m3u8`

#### Hotkeys:

- Hold down the `ctrl` or `cmd` key while clicking a manifest link to open it in a new viewer.
- `Shift` + click on a stream level manifest in the master level to download it
- `Shift` + click on the copy url icon to uri encode it before copying.
- `t` opens a new empty viewer
- `Shift` + `t` opens the last closed viewer, until there are none left

#### Storage

To save a viewer as it is in local storage, press `Save Viewer` in the icon bar. It will be accessible by name, if exists, or url, in a dropdown whenever the url input is focused. Clearing storage can be done with the `Clear Settings Storage` button in the options modal.

#### Other

- One can find text in a manifest using the search bar, openable from the search icon. To search using javascript regular expressions add a / to the beginning and end (e.g. `/EXT-X-.+:TYPE=/`). Normal search is case insensitive, regex search is case sensitive.

- Each viewer's name is editable by clicking on it and typing, and will be preserved in storage if saved.
- Viewers' widths can be resized by dragging the barrier between them
- Copying manifests will work much better on https because the `navigator.clipboard` api is available. Large manifests will fail to copy when it isn't.
- For hls streams the load status of fragments can be found next to its url - orange is loading, green is loaded and red is load error
- When a stream manifest is present, the user can download the fragment and copy the url by hovering over and clicking on the dot.

---

### Development

- NOTE: Node 14.x is needed to install the dependencies correctly
- Run `npm install` to install dependencies
- Run `npx ng serve` to temporarily build the app and start a dev server. Navigate to `http://localhost:4200/`. The app will automatically rebuild and reload if you change any of the source files.
- To build the app, run `ng build`. For production builds, use the `--prod` flag. The result of this build will be stored in the '/dist' directory.

### Metric Container

The metric container will be located below the video if video player is present. If no video player is present, the metric container will be on the right of the manifest text. It will contain video metrics, stall-detector, or Hls.js logs

### Docker Commands

If you want to test how this will run in prod, run this command:

docker-compose up --build
