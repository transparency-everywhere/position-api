import {
  expectEnvelope,
  expectValidPosition,
  getJson,
  resolveAdsbTarget,
  startServer,
  type RunningServer,
} from "./support";

const MINUTE = 60 * 1000;

describe("ADS-B Exchange (/adsb/adsbe)", () => {
  let server: RunningServer;
  let icao: string | null;

  beforeAll(async () => {
    server = await startServer();
    icao = await resolveAdsbTarget();
  }, 3 * MINUTE);

  afterAll(() => {
    server?.stop();
  });

  test(
    "returns a live position for a tracked aircraft",
    async () => {
      if (icao === null) {
        throw new Error(
          "No ADS-B target is currently being tracked by adsbexchange.com, so " +
            "the platform cannot be asserted. Pin a currently airborne " +
            "aircraft with ADSB_ICAO=<hex> and re-run.",
        );
      }

      const response = await getJson(
        server.baseUrl + "/adsb/adsbe/" + icao + "/location/latest",
      );

      expectEnvelope(response);
      expect(response.body.error).toBeNull();
      expectValidPosition(response.body.data);
    },
    3 * MINUTE,
  );

  test(
    "labels the position with the ADS-B source",
    async () => {
      if (icao === null) {
        throw new Error("No ADS-B target is currently being tracked.");
      }

      const response = await getJson(
        server.baseUrl + "/adsb/adsbe/" + icao + "/location/latest",
      );

      expect(response.body.data.source).toBe("adsbExchange");
      expect(response.body.data.source_type).toBe("adsb");
      // The upstream trace is passed through so callers can read fields the
      // Position contract does not cover (registration, aircraft type, ...).
      expect(response.body.data.raw).toBeTruthy();
      expect(response.body.data.raw.icao).toBe(icao);
    },
    3 * MINUTE,
  );

  test(
    "answers with an empty position for an aircraft that has no trace",
    async () => {
      // "zzzzzz" is not a valid ICAO hex, so adsbexchange.com has no trace
      // file for it. That has to read as "no data", not as a failure.
      const response = await getJson(
        server.baseUrl + "/adsb/adsbe/zzzzzz/location/latest",
      );

      expectEnvelope(response);
      expect(response.body.data).toBeNull();
    },
    2 * MINUTE,
  );

  test(
    "stays available after an unresolvable request",
    async () => {
      const response = await getJson(server.baseUrl + "/");
      expect(response.status).toBe(200);
    },
    MINUTE,
  );
});
