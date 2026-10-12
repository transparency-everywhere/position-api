import http from "http";
import Server from "../../src/classes/server";

/**
 * Known-good test subjects.
 *
 * SEA-WATCH 5 is a civil sea rescue vessel (IMO 9421556) that operates in the
 * central Mediterranean. It reports AIS continuously, which makes it a stable
 * subject for the AIS platforms.
 */
export const SEA_WATCH_5 = {
  mmsi: 211879870,
  imo: 9421556,
  name: "SEA-WATCH 5",
};

/**
 * ADS-B subjects, in the order they are tried. D-AIZI is a Lufthansa A320 that
 * flies daily inside dense European ADS-B coverage, so adsbexchange.com almost
 * always holds a recent trace for it. The rest are equally busy airliners and
 * only serve as stand-ins while the primary one is parked.
 *
 * Override with E2E_ICAO / ADSB_ICAO to pin the suite to one aircraft.
 */
export const ADSB_TARGETS = [
  { icao: "3c6749", registration: "D-AIZI" },
  { icao: "40621d", registration: "G-STBC" },
  { icao: "a12a7d", registration: "N17403" },
  { icao: "39e68b", registration: "F-HZUL" },
  { icao: "4008ad", registration: "G-EUPN" },
  { icao: "aa5a0e", registration: "N766YX" },
];

export interface JsonResponse {
  status: number;
  body: any;
  raw: string;
}

export interface RunningServer {
  baseUrl: string;
  stop: () => void;
}

/**
 * Boots the real express app on an OS-assigned port, so suites can run in
 * parallel without agreeing on port numbers up front.
 */
export async function startServer(): Promise<RunningServer> {
  const instance = new Server(0);
  const httpServer: http.Server = instance.server;

  if (!httpServer.listening) {
    await new Promise<void>((resolve, reject) => {
      httpServer.once("listening", () => {
        resolve();
      });
      httpServer.once("error", reject);
    });
  }

  const address = httpServer.address();
  const port =
    address !== null && typeof address === "object" ? address.port : 0;

  return {
    baseUrl: "http://127.0.0.1:" + port,
    stop: () => {
      instance.close();
    },
  };
}

export async function getJson(url: string): Promise<JsonResponse> {
  return await new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let body: any = null;
          try {
            body = JSON.parse(data);
          } catch {
            body = null;
          }
          resolve({ status: res.statusCode ?? 0, body, raw: data });
        });
      })
      .on("error", reject);
  });
}

/**
 * Asks adsbexchange.com directly whether it currently holds a trace for an
 * aircraft. Used to tell "our parsing broke" apart from "nothing is flying".
 */
export async function hasLiveTrace(icao: string): Promise<boolean> {
  const url =
    "https://globe.adsbexchange.com/data/traces/" +
    icao.slice(-2) +
    "/trace_recent_" +
    icao +
    ".json";

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "x-requested-with": "XMLHttpRequest",
        Referer: "https://globe.adsbexchange.com/?icao=" + icao,
      },
    });
    if (!response.ok) {
      return false;
    }
    const json: any = await response.json();
    return Array.isArray(json?.trace) && json.trace.length > 0;
  } catch {
    return false;
  }
}

/**
 * Resolves the aircraft the ADS-B suite should assert against: the pinned one
 * if it is set, otherwise the first target that is currently being tracked.
 */
export async function resolveAdsbTarget(): Promise<string | null> {
  const pinned = (process.env.ADSB_ICAO ?? process.env.E2E_ICAO)
    ?.trim()
    .toLowerCase();
  const candidates = pinned
    ? [pinned, ...ADSB_TARGETS.map((target) => target.icao)]
    : ADSB_TARGETS.map((target) => target.icao);

  for (const icao of candidates) {
    if (await hasLiveTrace(icao)) {
      return icao;
    }
  }
  return null;
}

/**
 * Asserts the parts of the Position contract that every platform shares.
 * Timestamps arrive either as epoch seconds (ADS-B) or as an ISO string (AIS),
 * so both are accepted and only have to denote a real point in time.
 */
export function expectValidPosition(position: any): void {
  expect(position).toBeTruthy();

  expect(typeof position.latitude).toBe("number");
  expect(Number.isNaN(position.latitude)).toBe(false);
  expect(position.latitude).toBeGreaterThanOrEqual(-90);
  expect(position.latitude).toBeLessThanOrEqual(90);

  expect(typeof position.longitude).toBe("number");
  expect(Number.isNaN(position.longitude)).toBe(false);
  expect(position.longitude).toBeGreaterThanOrEqual(-180);
  expect(position.longitude).toBeLessThanOrEqual(180);

  expect(typeof position.course).toBe("number");
  expect(Number.isNaN(position.course)).toBe(false);
  expect(typeof position.speed).toBe("number");
  expect(Number.isNaN(position.speed)).toBe(false);

  const reportedAt =
    typeof position.timestamp === "number"
      ? new Date(position.timestamp * 1000)
      : new Date(position.timestamp);
  expect(Number.isNaN(reportedAt.getTime())).toBe(false);
  // A position from before AIS/ADS-B existed, or from the future, means the
  // timestamp was misparsed rather than merely stale.
  expect(reportedAt.getFullYear()).toBeGreaterThan(2000);
  expect(reportedAt.getTime()).toBeLessThan(Date.now() + 24 * 60 * 60 * 1000);
}

/**
 * Asserts the `{ error, data }` envelope that every endpoint answers with.
 */
export function expectEnvelope(response: JsonResponse): void {
  expect(response.status).toBe(200);
  expect(response.body).not.toBeNull();
  expect(response.body).toHaveProperty("error");
  expect(response.body).toHaveProperty("data");
}
