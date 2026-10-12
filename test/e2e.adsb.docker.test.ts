import dotenv from "dotenv";
import http from "http";
import https from "https";

dotenv.config();

const API_URL = process.env.E2E_API_URL ?? "http://localhost:5001";
const E2E_ICAO = process.env.E2E_ICAO?.trim().toLowerCase();

// Busy airliners in dense ADS-B coverage, tried in order. An aircraft only
// has a trace while it is being tracked, so the suite needs several. Keep this
// list in step with ADSB_TARGETS in test/integration/support.ts.
const ICAO_FALLBACKS = [
  "3c6749",
  "40621d",
  "a12a7d",
  "39e68b",
  "4008ad",
  "aa5a0e",
];

interface HttpResult {
  status: number;
  body: string;
}

async function fetchUrl(url: string): Promise<HttpResult> {
  return await new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: data,
          });
        });
      })
      .on("error", reject);
  });
}

async function waitForApi(baseUrl: string, timeoutMs = 90000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetchUrl(baseUrl + "/");
      if (res.status >= 200 && res.status < 500) {
        return;
      }
    } catch {
      // Keep retrying until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(
    `API at ${baseUrl} did not become ready within ${timeoutMs}ms`,
  );
}

async function fetchLiveTrace(icao: string): Promise<any | null> {
  const url =
    "https://globe.adsbexchange.com/data/traces/" +
    icao.slice(-2) +
    "/trace_recent_" +
    icao +
    ".json";

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "de-DE,de;q=0.9",
      "sec-ch-ua": '"Chromium";v="116", "Not)A;Brand";v="24", "Brave";v="116"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "sec-gpc": "1",
      "x-requested-with": "XMLHttpRequest",
      Referer: "https://globe.adsbexchange.com/?icao=39e68b",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });

  if (!res.ok) {
    return null;
  }

  try {
    const json = await res.json();
    return json;
  } catch {
    return null;
  }
}

async function discoverIcao(): Promise<string> {
  const candidates = E2E_ICAO ? [E2E_ICAO, ...ICAO_FALLBACKS] : ICAO_FALLBACKS;

  for (const icao of candidates) {
    const trace = await fetchLiveTrace(icao);
    if (Array.isArray(trace?.trace) && trace.trace.length > 0) {
      return icao;
    }
  }

  throw new Error(
    "No ADS-B ICAO candidate returned live trace data. Set E2E_ICAO to a currently active aircraft ICAO and retry.",
  );
}

describe("Docker E2E: ADS-B endpoint", () => {
  test("returns parsed location for a live ICAO", async () => {
    await waitForApi(API_URL);
    const liveIcao = await discoverIcao();
    const res = await fetchUrl(
      `${API_URL}/adsb/adsbe/${liveIcao}/location/latest`,
    );

    expect(res.status).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload).toBeDefined();
    expect(payload.error).toBeNull();
    expect(payload.data).toBeDefined();
    expect(typeof payload.data.latitude).toBe("number");
    expect(typeof payload.data.longitude).toBe("number");
    expect(payload.data.source).toBe("adsbExchange");
    expect(payload.data.source_type).toBe("adsb");
    expect(payload.data.raw).toBeDefined();
  }, 180000);
});
