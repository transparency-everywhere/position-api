# Position API

A Node.js/TypeScript API that returns the latest reported position of a vessel
or an aircraft. It reads the free public web trackers and normalises whatever
they publish into one JSON shape.

This repository succeeds the older `ais-api`. The routes under `/legacy` come
from it and are kept for existing clients.

## Platforms

Positions come from several independent sources, each reached over a different
transport. Some of these sources actively block automated access, so the table
below records what each one currently returns.

| Platform            | Route                                                                                      | How it is read         | Status                                            |
| ------------------- | ------------------------------------------------------------------------------------------ | ---------------------- | ------------------------------------------------- |
| ADS-B Exchange      | `GET /adsb/adsbe/:icao/location/latest`                                                    | HTTPS JSON trace       | Working                                           |
| MyShipTracking      | `GET /legacy/getLastPositionFromVF/:mmsi`                                                  | Headless browser       | Working                                           |
| Marinetraffic       | `GET /ais/mt/:mmsi/location/latest`<br>`GET /legacy/getLastPositionFromMT/:mmsi`           | Map tile endpoint      | Working — see [Platform status](#platform-status)  |
| Combined (AIS)      | `GET /legacy/getLastPosition/:mmsi`                                                        | Both AIS sources       | Working — keeps the newer report                  |
| Marinetraffic areas | `GET /legacy/getVesselsInArea/:area`<br>`GET /legacy/getVesselsNearMe/:lat/:lng/:distance` | Headless browser       | No data — see [Platform status](#platform-status)  |
| Marinetraffic ports | `GET /legacy/getVesselsInPort/:shipPort`                                                   | HTTPS report           | No data — see [Platform status](#platform-status)  |

### Platform status

**Marinetraffic** no longer serves its vessel detail page to an automated
browser: that URL answers `200` with the generic live map, and every
vessel-specific endpoint — global search, `vesselDetails/latestPosition`, the
report API — answers `403`. The one endpoint that still serves data is the one
the public map itself reads, `getData/get_data_json_4`, which returns the
vessels inside a single map tile.

That endpoint is addressed by **area** and publishes no MMSI, only `SHIPNAME`
and Marinetraffic's own `SHIP_ID`. A lookup by MMSI therefore needs two things
it cannot supply: the vessel's name, and somewhere to start looking. Both come
from MyShipTracking, after which the tiles around that position are searched —
3x3 tiles at zoom 11, then 8, 6 and 4 — and the row is matched by name. The
position that comes back is Marinetraffic's own report, which is usually far
fresher than the one used to find it.

The finest zoom is searched first because the tile endpoint thins out its
answer at coarse zooms and returns only a sample of the vessels in a tile. A
vessel moored in a busy port is only reliably listed from about zoom 11 on;
the coarse levels still find one that has moved out to sea, where density is
low.

Two consequences worth knowing:

- Marinetraffic cannot answer for a vessel MyShipTracking does not know.
- It cannot find a vessel that has sailed outside the searched area since its
  last MyShipTracking report. The search widens to a whole sea region before
  giving up, but a long-stale starting point can still miss.

The **area and port** routes scrape Marinetraffic's report endpoint, which is
among the ones answering `403`. They report "no vessels" rather than a wrong
answer, and the integration suite asserts that a refused scrape can never
return a half-parsed result or take the process down.

**MyShipTracking** sits behind a bot check, so it is read through a real
browser. It withholds exact coordinates from the detail table for anonymous
visitors; the position is taken from the report summary on the same page,
which does publish it.

Nothing here forges a browser identity: the stealth plugin keeps the real
browser's fingerprint self-consistent, and requests go to the same endpoints
the public map calls. An earlier `--user-agent` override that claimed Chrome 90
on Windows while running a current Chrome on another platform was removed —
it contradicted every other signal a site sees.

## Getting started

### Prerequisites

- **Node.js 22.12 or newer.** Puppeteer 25 requires it. Older versions may
  work but are not supported. An `.nvmrc` pins the major version for `nvm use`.
- npm
- A Chrome build for Puppeteer. `npm install` downloads it through Puppeteer's
  postinstall script. Recent npm versions skip install scripts until they are
  approved, so if the browser is missing, fetch it explicitly:

  ```bash
  npx puppeteer browsers install chrome
  ```

### Installation

```bash
git clone https://github.com/transparency-everywhere/position-api.git
cd position-api
npm install
```

### Configuration

`npm install` creates `.env` from `.env.template`. The only setting is the
listening port:

```
PORT=5001
```

### Build and run

```bash
npm run build   # compiles into dist/ and copies the static assets
npm start       # runs src/ directly through tsx
npm run dev     # recompiles and restarts on change
```

`npm start` is what the container runs. `npm run build` is needed for
`npm run dev` and for anything that serves `dist/`.

### Docker

```bash
docker compose up --build
```

The image is based on `ghcr.io/puppeteer/puppeteer` and installs its own
matching Chrome build, so `PUPPETEER_EXECUTABLE_PATH` must stay unset —
pointing it at a system Chromium gives Puppeteer a browser it cannot drive.

## API

Every position route answers `200` with the same envelope:

```json
{
  "error": null,
  "data": {
    "timestamp": "2026-10-09T17:11:00.000Z",
    "latitude": 33.22338,
    "longitude": 14.39467,
    "course": 112,
    "speed": 2.6
  }
}
```

`data` is `null` when the source published no position for that vehicle, which
is a normal answer rather than a failure. `error` carries a message when the
lookup itself failed. `latitude` and `longitude` are decimal degrees, `course`
is degrees, and `speed` is knots for vessels and ADS-B ground speed for
aircraft.

On `/adsb/adsbe` and `/ais/mt`, `error` is a string. The `/legacy` routes keep
the shape their original clients expect and pass the failure through as an
object, which serialises to `{}` — check it for truthiness, not for content.

The ADS-B route additionally reports the barometric altitude in feet, whether
the aircraft is on the ground, and passes the upstream trace through, so
callers can read fields this shape does not cover:

```json
{
  "error": null,
  "data": {
    "timestamp": 1791666363.664,
    "latitude": 54.292694,
    "longitude": 12.631208,
    "course": 34.8,
    "speed": 478.5,
    "altitude": 37000,
    "on_ground": false,
    "source": "adsbExchange",
    "source_type": "adsb",
    "raw": { "icao": "3c6749", "r": "D-AIZI", "t": "A320" }
  }
}
```

ADS-B timestamps are epoch seconds; AIS timestamps are ISO 8601 in UTC. While
an aircraft is on the ground its trace carries no altitude and often no track,
so `altitude` is `0`, `on_ground` is `true`, and `course` and `speed` are `0`
when the receiver reported none. The ICAO address is six hex digits in either
case; anything else answers with `data: null` without a lookup.

The area, port and vessel-list routes answer with a bare JSON array, or `null`
when the source returned nothing.

### Examples

```bash
# Aircraft by ICAO hex
curl http://localhost:5001/adsb/adsbe/3c6749/location/latest

# Vessel by MMSI (MyShipTracking)
curl http://localhost:5001/legacy/getLastPositionFromVF/211879870

# Vessel by MMSI, newest report from either AIS source
curl http://localhost:5001/legacy/getLastPosition/211879870

# Vessel by MMSI (Marinetraffic)
curl http://localhost:5001/ais/mt/211879870/location/latest

# Vessels in an area, near a point, or in a port
curl http://localhost:5001/legacy/getVesselsInArea/WMED,EMED
curl http://localhost:5001/legacy/getVesselsNearMe/37.7749/-122.4194/10
curl http://localhost:5001/legacy/getVesselsInPort/Hamburg
```

`GET /` serves this readme as HTML. Regenerate it with
`npm run generate:readme` (needs `pandoc`) after editing `readme.md`.

## Testing

| Command                    | What it covers                               | Needs            |
| -------------------------- | -------------------------------------------- | ---------------- |
| `npm test`                 | Route contract over the in-process app       | Nothing          |
| `npm run test:integration` | Every platform against its live source       | Network, Chrome  |
| `npm run test:e2e:docker`  | The ADS-B endpoint through a built container | Docker           |

`npm test` is the fast suite and is what CI runs on every push. It drives the
app in process and asserts that every route answers in the documented
envelope, without reaching a live source. The integration and Docker suites
are excluded from it because they depend on third-party sources, and run on a
schedule instead.

Puppeteer is ESM-only, and Jest's CommonJS runtime only services a dynamic
import when Node is started with `--experimental-vm-modules`. The
`test:integration` script sets that flag; `npm test` runs without it, so the
browser-backed sources are not exercised there. See `src/lib/esm.ts` for how
the import is kept intact through the compiler and the test transform.

### Integration suite

`npm run test:integration` boots the real app on an OS-assigned port and
exercises each platform end to end. It is deliberately slow: several platforms
drive a real browser through a bot check, so the whole suite takes minutes.

Each suite runs in its own jest process (see `test/integration.sh`). Sharing
one process let async work from a finished suite fail the next one, and let
browser pressure from one suite starve another's launches.

It asserts against fixed, well-known subjects:

- **Vessels: SEA-WATCH 5** (MMSI `211879870`, IMO `9421556`), a civil sea
  rescue vessel operating in the central Mediterranean. It reports AIS
  continuously, which makes it a stable subject, and its position is checked
  against the Mediterranean bounding box to catch swapped or half-parsed
  coordinates.
- **Aircraft: D-AIZI** (ICAO `3c6749`), a Lufthansa A320 that flies daily
  inside dense European ADS-B coverage. Aircraft only have a trace while they
  are being tracked, so the suite falls back through a list of equally busy
  airliners and fails with a clear message if none of them is currently
  airborne. Pin a specific aircraft with `ADSB_ICAO=<hex>`.

A failure caused by an unreachable source names the source, so it can be told
apart from a parsing regression.

### Docker suite

`npm run test:e2e:docker` builds the image, starts it with Docker Compose,
waits for the API, and asserts the ADS-B endpoint against a live aircraft.
Override the target with `E2E_ICAO=<hex>` and the base URL with
`E2E_API_URL=<url>`.

## Development

```bash
npm run lint        # eslint
npm run lint:fix    # eslint --fix
npm run prettier    # format
```

ESLint extends `standard-with-typescript` with `eslint-config-prettier` last,
so formatting is Prettier's job alone and the two do not contradict each
other.

### Layout

```
src/
  index.ts              entry point
  lib/esm.ts            loads ESM-only packages from this CommonJS codebase
  classes/
    server.ts           express app and routes
    sources/
      Source.ts         shared base: browser handling, fetch, validation
      Position.d.ts     the position shape
      adsb/adsbe.ts     ADS-B Exchange
      ais/mt.ts         Marinetraffic
      ais/mst.ts        MyShipTracking
  legacy/               routes and scrapers inherited from ais-api
  static/index.html     generated from readme.md
test/
  api.curl.test.ts      route contract, no live sources required
  integration/          one suite per platform, against live sources
  integration.sh        runs each integration suite in its own process
  e2e.adsb.docker.test.ts  container end-to-end
```

### Adding a platform

1. Add a class under `src/classes/sources/` that extends `Source` and returns
   the position shape above from `getLocation`. Use `this.fetch` for a plain
   HTTP source and `this.fetchRendered` for one behind a bot check; call
   `this.verifyPosition` before returning, and `this.closeBrowser` when done —
   every request builds its own instance, so an unreleased browser leaks a
   Chrome process.
2. Register a route in `src/classes/server.ts`. Catch upstream failures inside
   the handler: an express 4 route does not catch a rejected promise, and an
   uncaught one ends the process.
3. Add a suite under `test/integration/` and list the platform in the table
   above.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to
discuss what you would like to change.

## License

[ISC](LICENSE)

---

_Powered by Node.js, Express, Puppeteer, and TypeScript._
