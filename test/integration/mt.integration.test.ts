import { normaliseName } from "../../src/classes/sources/ais/mt";
import {
  SEA_WATCH_5,
  expectEnvelope,
  expectValidPosition,
  getJson,
  startServer,
  type JsonResponse,
  type RunningServer,
} from "./support";

const MINUTE = 60 * 1000;

/**
 * Marinetraffic refuses its vessel detail page and every vessel-specific
 * endpoint to an automated browser. The position comes from the tile endpoint
 * the public map reads, which is addressed by area and carries no MMSI, so the
 * source resolves the vessel through MyShipTracking first — see
 * src/classes/sources/ais/mt.ts.
 */
describe("Marinetraffic (/ais/mt and /legacy/getLastPositionFromMT)", () => {
  let server: RunningServer;
  let current: JsonResponse;
  let legacy: JsonResponse;

  beforeAll(async () => {
    server = await startServer();
    // Each lookup resolves the vessel through MyShipTracking and then opens a
    // Marinetraffic session, so both routes are exercised once here.
    current = await getJson(
      server.baseUrl + "/ais/mt/" + SEA_WATCH_5.mmsi + "/location/latest",
    );
    legacy = await getJson(
      server.baseUrl + "/legacy/getLastPositionFromMT/" + SEA_WATCH_5.mmsi,
    );
  }, 10 * MINUTE);

  afterAll(() => {
    server?.stop();
  });

  test("returns a live position for SEA-WATCH 5", () => {
    expectEnvelope(current);
    expect(current.body.error).toBeNull();
    expectValidPosition(current.body.data);
  });

  test("returns the position of the vessel that was asked for", () => {
    // The tile endpoint answers with every vessel in an area, so the one that
    // came back has to be matched by name or the source would happily report a
    // neighbouring ship.
    const row = current.body.data.originalResponse;
    expect(row).toBeTruthy();
    expect(normaliseName(row.SHIPNAME)).toBe(normaliseName(SEA_WATCH_5.name));
    // 58 m, German flag — a cross-check that this is the right SEA WATCH.
    expect(row.FLAG).toBe("DE");
  });

  test("reports the position in the Mediterranean operating area", () => {
    const position = current.body.data;
    expect(position.latitude).toBeGreaterThan(29);
    expect(position.latitude).toBeLessThan(47);
    expect(position.longitude).toBeGreaterThan(-7);
    expect(position.longitude).toBeLessThan(37);
  });

  test("converts speed out of tenths of a knot and dates the report", () => {
    const position = current.body.data;
    const row = position.originalResponse;

    expect(position.speed).toBeCloseTo(Number(row.SPEED) / 10, 5);
    expect(position.course).toBe(Number(row.COURSE));

    // ELAPSED is the age of the report in minutes.
    const ageMinutes = (Date.now() - Date.parse(position.timestamp)) / MINUTE;
    expect(ageMinutes).toBeGreaterThanOrEqual(0);
    expect(ageMinutes).toBeLessThan(Number(row.ELAPSED) + 30);
  });

  test("answers the legacy route with the same position", () => {
    expectEnvelope(legacy);
    expect(legacy.body.error).toBeNull();
    expectValidPosition(legacy.body.data);
    expect(normaliseName(legacy.body.data.originalResponse.SHIPNAME)).toBe(
      normaliseName(SEA_WATCH_5.name),
    );
  });

  test(
    "answers for an unknown MMSI instead of hanging or crashing",
    async () => {
      // 1 is not a valid MMSI, so the vessel cannot be resolved and there is
      // nowhere to search: that has to read as "no position".
      const response = await getJson(
        server.baseUrl + "/legacy/getLastPositionFromMT/1",
      );

      expectEnvelope(response);
      expect(response.body.data).toBeNull();

      const root = await getJson(server.baseUrl + "/");
      expect(root.status).toBe(200);
    },
    5 * MINUTE,
  );
});
