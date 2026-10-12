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
 * MyShipTracking is reached through the legacy route. The name says VF
 * (VesselFinder) for backwards compatibility only — the route is served by
 * MyShipTracking, see the comment on the route itself.
 */
const route = (mmsi: number): string => "/legacy/getLastPositionFromVF/" + mmsi;

describe("MyShipTracking (/legacy/getLastPositionFromVF)", () => {
  let server: RunningServer;
  // Each request drives a real browser through a bot check, so the vessel is
  // fetched once and the assertions below all read that one response.
  let seaWatch: JsonResponse;

  beforeAll(async () => {
    server = await startServer();
    seaWatch = await getJson(server.baseUrl + route(SEA_WATCH_5.mmsi));
  }, 5 * MINUTE);

  afterAll(() => {
    server?.stop();
  });

  test("returns the last reported position of SEA-WATCH 5", () => {
    expectEnvelope(seaWatch);
    expect(seaWatch.body.error).toBeNull();
    expectValidPosition(seaWatch.body.data);
  });

  test("reports the position in the Mediterranean operating area", () => {
    const position = seaWatch.body.data;

    expectValidPosition(position);
    // A sanity check on the parsing rather than on the ship: swapped or
    // half-parsed coordinates would land far outside this box, while the
    // vessel itself may legitimately be anywhere from Barcelona to Cyprus.
    expect(position.latitude).toBeGreaterThan(29);
    expect(position.latitude).toBeLessThan(47);
    expect(position.longitude).toBeGreaterThan(-7);
    expect(position.longitude).toBeLessThan(37);
  });

  test("reads course and speed from the page", () => {
    const position = seaWatch.body.data;

    expect(typeof position.course).toBe("number");
    expect(position.course).toBeGreaterThanOrEqual(0);
    expect(position.course).toBeLessThanOrEqual(360);
    expect(typeof position.speed).toBe("number");
    expect(position.speed).toBeGreaterThanOrEqual(0);
  });

  test("timestamps the report as UTC", () => {
    // The page prints "2026-10-09 17:11" with no zone; it is published in UTC
    // and has to be normalised, not read as the server's local time.
    expect(typeof seaWatch.body.data.timestamp).toBe("string");
    expect(seaWatch.body.data.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  test(
    "answers with an error envelope for an unknown MMSI",
    async () => {
      // 1 is not a valid MMSI, so the vessel page carries no AIS report.
      const response = await getJson(server.baseUrl + route(1));

      expectEnvelope(response);
      expect(response.body.data).toBeNull();
      expect(response.body.error).toBeTruthy();
    },
    5 * MINUTE,
  );
});
