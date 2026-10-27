import fetch from "node-fetch";
import Source from "../Source";

/**
 * How long one trace request may take. The upstream normally answers within
 * a second; without a ceiling a stalled connection held the HTTP request
 * that asked for it open indefinitely.
 */
const REQUEST_TIMEOUT_MS = 20000;

/**
 * An ICAO 24-bit address is six hex digits. Anything else cannot have a trace
 * file, and would otherwise be interpolated into a URL path unchecked.
 */
const ICAO_PATTERN = /^[0-9a-f]{6}$/;

/**
 * One row of a trace, as adsbexchange.com publishes it. The readme of its
 * globe application documents the layout:
 *   [seconds since `timestamp`, lat, lon, alt_baro, ground speed, track, ...]
 * alt_baro is the literal string "ground" while the aircraft is on the
 * ground, and track and speed may be null when the receiver had no value.
 */
type TraceRow = [number, number, number, number | "ground" | null, ...any[]];

const toNumber = (value: any, fallback: number): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

class ADSBExchange extends Source {
  getLocation = async (icao: string) => {
    const hex = String(icao ?? "")
      .trim()
      .toLowerCase();
    if (!ICAO_PATTERN.test(hex)) {
      // Not a possible aircraft address, so there is nothing to look up. This
      // reads as "no position" rather than as an upstream failure.
      console.error(`Not an ICAO hex address: ${JSON.stringify(icao)}`);
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(
        `https://globe.adsbexchange.com/data/traces/${hex.slice(
          -2,
        )}/trace_recent_${hex}.json`,
        {
          headers: {
            accept: "application/json, text/javascript, */*; q=0.01",
            "accept-language": "de-DE,de;q=0.9",
            "sec-ch-ua":
              '"Chromium";v="116", "Not)A;Brand";v="24", "Brave";v="116"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "sec-gpc": "1",
            "x-requested-with": "XMLHttpRequest",
            // The globe page that would issue this request for this aircraft.
            Referer: `https://globe.adsbexchange.com/?icao=${hex}`,
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
          body: undefined,
          method: "GET",
          signal: controller.signal,
        },
      );
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new Error(
          `adsbexchange.com did not answer within ${REQUEST_TIMEOUT_MS} ms`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      if (response.status === 404) {
        // No trace file exists for an aircraft that has not been seen
        // recently, which is a normal answer rather than a failure.
        console.error(`Data not found for ICAO: ${hex}`);
        return null;
      }
      throw new Error(
        `Failed to fetch data: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    const body = await response.text();
    let bodyjson: any;
    try {
      bodyjson = JSON.parse(body);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Failed to parse JSON: ${err.message}`);
      } else {
        throw new Error("Failed to parse JSON: Unknown error");
      }
    }

    const trace: TraceRow[] | undefined = Array.isArray(bodyjson?.trace)
      ? bodyjson.trace
      : undefined;
    const lastTrace = trace?.[trace.length - 1];
    if (lastTrace === undefined || !Array.isArray(lastTrace)) {
      // The file exists but holds no positions yet: no data, not an error.
      console.error(`Empty trace for ICAO: ${hex}`);
      return null;
    }

    const [timeOffset, lat, lon, altBaro, groundSpeed, groundTrack] = lastTrace;
    const position = {
      timestamp: toNumber(bodyjson.timestamp, 0) + toNumber(timeOffset, 0),
      latitude: lat,
      longitude: lon,
      course: toNumber(groundTrack, 0),
      speed: toNumber(groundSpeed, 0), // knots
      // Barometric altitude in feet; 0 while the aircraft is on the ground.
      altitude: altBaro === "ground" ? 0 : toNumber(altBaro, 0),
      on_ground: altBaro === "ground",
      raw: bodyjson,
      source: "adsbExchange",
      source_type: "adsb",
    };
    this.verifyPosition(position);
    return position;
  };
}

export default ADSBExchange;
