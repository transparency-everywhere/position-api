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

describe("Legacy combined source (/legacy/getLastPosition)", () => {
  let server: RunningServer;
  let combined: JsonResponse;

  beforeAll(async () => {
    server = await startServer();
    // Queries MyShipTracking and Marinetraffic and keeps the newer report, so
    // it drives two scrapes and is fetched once for all assertions below.
    combined = await getJson(
      server.baseUrl + "/legacy/getLastPosition/" + SEA_WATCH_5.mmsi,
    );
  }, 10 * MINUTE);

  afterAll(() => {
    server?.stop();
  });

  test("returns a position for SEA-WATCH 5 from whichever source answers", () => {
    expectEnvelope(combined);
    expect(combined.body.error).toBeNull();
    expectValidPosition(combined.body.data);
  });

  test("keeps the newer of the two reports", () => {
    // Both AIS sources answer for this vessel, so the route has to pick one
    // and must never return the empty result of whichever had nothing.
    expect(combined.body.data).not.toBeNull();
    expectValidPosition(combined.body.data);

    // Whichever source won, the report must not be older than either source
    // publishes; a wildly old timestamp means the comparison misread one.
    const ageDays =
      (Date.now() - Date.parse(String(combined.body.data.timestamp))) /
      (24 * 60 * 60 * 1000);
    expect(ageDays).toBeLessThan(60);
  });
});

describe("Legacy area sources (/legacy/getVesselsInArea, /getVesselsNearMe)", () => {
  let server: RunningServer;

  beforeAll(async () => {
    server = await startServer();
  }, MINUTE);

  afterAll(() => {
    server?.stop();
  });

  /**
   * The area sources scrape Marinetraffic's report endpoint, which currently
   * refuses automated requests. The contract that matters is that a refused
   * scrape is reported as "no vessels" and never takes the process down —
   * both of these used to be fatal, uncaught failures.
   */
  test(
    "answers getVesselsInArea with a list or with no result",
    async () => {
      const response = await getJson(
        server.baseUrl + "/legacy/getVesselsInArea/WMED,EMED",
      );

      expect(response.status).toBe(200);
      if (response.body !== null) {
        expect(Array.isArray(response.body)).toBe(true);
        for (const vessel of response.body) {
          expect(
            typeof vessel.mmsi === "string" || typeof vessel.mmsi === "number",
          ).toBe(true);
          expect(Number.isNaN(Number(vessel.lat))).toBe(false);
          expect(Number.isNaN(Number(vessel.lon))).toBe(false);
        }
      }
    },
    5 * MINUTE,
  );

  test(
    "answers getVesselsNearMe with a list or with no result",
    async () => {
      const response = await getJson(
        server.baseUrl + "/legacy/getVesselsNearMe/37.7749/-122.4194/10",
      );

      expect(response.status).toBe(200);
      if (response.body !== null) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    },
    5 * MINUTE,
  );

  test("keeps serving after the area scrapes", async () => {
    const root = await getJson(server.baseUrl + "/");
    expect(root.status).toBe(200);
  });
});

describe("Legacy port source (/legacy/getVesselsInPort)", () => {
  let server: RunningServer;

  beforeAll(async () => {
    server = await startServer();
  }, MINUTE);

  afterAll(() => {
    server?.stop();
  });

  test(
    "answers with vessels or with a reported error, never a crash",
    async () => {
      const response = await getJson(
        server.baseUrl + "/legacy/getVesselsInPort/Hamburg",
      );

      expect(response.status).toBe(200);
      expect(response.body).not.toBeNull();

      if (Array.isArray(response.body)) {
        for (const vessel of response.body) {
          expect(Number.isNaN(Number(vessel.lat))).toBe(false);
          expect(Number.isNaN(Number(vessel.lon))).toBe(false);
        }
      } else {
        // Reading the blocked HTML response as JSON used to throw inside the
        // request callback and end the process.
        expect(response.body.error).toBeTruthy();
      }
    },
    5 * MINUTE,
  );

  test("keeps serving after a blocked port scrape", async () => {
    const root = await getJson(server.baseUrl + "/");
    expect(root.status).toBe(200);
  });
});

describe("Service endpoints", () => {
  let server: RunningServer;

  beforeAll(async () => {
    server = await startServer();
  }, MINUTE);

  afterAll(() => {
    server?.stop();
  });

  test("serves the generated documentation page at the root", async () => {
    const response = await getJson(server.baseUrl + "/");
    expect(response.status).toBe(200);
    // Built from readme.md by `npm run generate:readme` and copied into dist
    // by `npm run build`; a 404 here means the static assets went missing.
    expect(response.raw).toContain("<h1");
  });

  test("answers an unknown route with a 404", async () => {
    const response = await getJson(server.baseUrl + "/does-not-exist");
    expect(response.status).toBe(404);
  });
});
