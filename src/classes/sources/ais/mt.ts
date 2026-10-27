import Source from "../Source";
import MyShipTracking from "./mst";

/**
 * Marinetraffic no longer serves its vessel detail page to an automated
 * browser: the URL answers 200 with the generic live map, and every
 * vessel-specific endpoint (global search, vesselDetails/latestPosition, the
 * report API) answers 403. The only endpoint that still serves data is the one
 * the public map itself reads, getData/get_data_json_4, which returns the
 * vessels inside one map tile.
 *
 * That endpoint is addressed by area and publishes no MMSI — only SHIPNAME and
 * Marinetraffic's own SHIP_ID. So a lookup by MMSI needs two things it cannot
 * provide itself: the vessel's name, and somewhere to start looking. Both are
 * taken from MyShipTracking, and the position that comes back is then
 * Marinetraffic's own report, which is usually far fresher.
 *
 * Consequence worth knowing: this source cannot answer for a vessel that
 * MyShipTracking does not know, and it cannot find one that has moved outside
 * the searched area since its last MyShipTracking report.
 */

const TILE_ENDPOINT = "https://www.marinetraffic.com/getData/get_data_json_4";

/**
 * Zoom levels to search, narrowest first. Each is searched as a 3x3 block of
 * tiles around the seed position, so a wider zoom tolerates a staler seed:
 * z:11 covers roughly 90 km around the seed, z:8 a few hundred km, z:4 a
 * whole sea region.
 *
 * The finest level comes first for a reason beyond speed: the tile endpoint
 * thins out its answer at coarse zooms, returning only a sample of the
 * vessels in a tile (a 3x3 block at z:8 listed ten ships in a port that
 * holds forty). A vessel moored among many others is therefore only
 * reliably returned from about z:11 on, while the coarse levels still find
 * one that has moved out to sea, where density is low.
 */
const SEARCH_ZOOMS = [11, 8, 6, 4];

/**
 * Marinetraffic addresses tiles as "z:N", where N indexes a grid of
 * 2^(N-1) x 2^(N-1) tiles over the web-mercator world. Verified against the
 * requests the live map issues.
 */
export function tileFor(
  latitude: number,
  longitude: number,
  zoom: number,
): { x: number; y: number; count: number } {
  const count = Math.pow(2, zoom - 1);
  const latRad = (latitude * Math.PI) / 180;
  return {
    x: Math.floor(((longitude + 180) / 360) * count),
    y: Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
        count,
    ),
    count,
  };
}

/** What a lookup needs to start from: who to look for, and roughly where. */
export interface VesselSeed {
  name?: string;
  latitude: number;
  longitude: number;
}

/** Names differ in punctuation between sources ("SEA-WATCH 5" / "SEA WATCH 5"). */
export const normaliseName = (name: any): string =>
  String(name ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

class Marinetraffic extends Source {
  /**
   * Turns one tile row into the shared position shape. Marinetraffic reports
   * SPEED in tenths of a knot, COURSE in whole degrees, and ELAPSED as the
   * number of minutes since the position was received.
   */
  parseRow = function (row: any) {
    const elapsedMinutes = Number(row.ELAPSED);
    const reportedAt = new Date(
      Date.now() - (isNaN(elapsedMinutes) ? 0 : elapsedMinutes * 60000),
    );
    return {
      latitude: parseFloat(row.LAT),
      longitude: parseFloat(row.LON),
      course: parseFloat(row.COURSE ?? row.HEADING ?? 0),
      speed: parseFloat(row.SPEED ?? 0) / 10,
      timestamp: reportedAt.toISOString(),
      originalResponse: row,
    };
  };

  /** The tile paths making up a 3x3 block around a position. */
  tilePaths = function (latitude: number, longitude: number, zoom: number) {
    const { x, y, count } = tileFor(latitude, longitude, zoom);
    const paths: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tileX = (((x + dx) % count) + count) % count; // longitude wraps
        const tileY = y + dy;
        if (tileY < 0 || tileY >= count) {
          continue; // past a pole
        }
        paths.push(
          TILE_ENDPOINT +
            "/z:" +
            zoom +
            "/X:" +
            tileX +
            "/Y:" +
            tileY +
            "/station:0",
        );
      }
    }
    return paths;
  };

  /**
   * @param mmsi   The vessel to look up.
   * @param seed   The vessel's name and last known position, if the caller
   *               already holds them (the combined legacy route does, having
   *               just asked MyShipTracking). Otherwise they are resolved
   *               here, which costs a second browser session.
   */
  getLocation = async (mmsi: number, seed?: VesselSeed | null) => {
    // Resolve the vessel's name and roughly where to look. Without this there
    // is no way to turn an MMSI into something the tile endpoint understands.
    if (seed === undefined || seed === null) {
      try {
        seed = await new MyShipTracking().getVessel(mmsi);
      } catch (err) {
        console.error(
          "Could not resolve MMSI " + mmsi + " to a vessel to search for:",
          err,
        );
        return null;
      }
    }

    const wanted = normaliseName(seed?.name);
    if (wanted === "") {
      console.error("No vessel name available for MMSI " + mmsi);
      return null;
    }

    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // The tile endpoint only answers within a browsing session on the site,
      // so the map is opened first and the tiles are then read from inside
      // that page, which carries its cookies and origin.
      await page.goto(
        "https://www.marinetraffic.com/en/ais/home/centerx:" +
          seed.longitude +
          "/centery:" +
          seed.latitude +
          "/zoom:" +
          SEARCH_ZOOMS[0],
        { waitUntil: "domcontentloaded", timeout: 90000 },
      );

      for (const zoom of SEARCH_ZOOMS) {
        const paths = this.tilePaths(seed.latitude, seed.longitude, zoom);
        const rows = await page.evaluate(async (tileUrls: string[]) => {
          const collected: any[] = [];
          for (const url of tileUrls) {
            try {
              const response = await fetch(url, {
                headers: {
                  "x-requested-with": "XMLHttpRequest",
                  accept: "application/json, text/javascript, */*; q=0.01",
                },
              });
              if (!response.ok) {
                continue;
              }
              const payload = await response.json();
              if (Array.isArray(payload?.data?.rows)) {
                collected.push(...payload.data.rows);
              }
            } catch {
              // A single unavailable tile must not end the search.
            }
          }
          return collected;
        }, paths);

        const match = rows.find(
          (row: any) => normaliseName(row.SHIPNAME) === wanted,
        );
        if (match !== undefined) {
          console.log(
            "Found " +
              seed.name +
              " in Marinetraffic tile data at zoom " +
              zoom,
          );
          const position = this.parseRow(match);
          this.verifyPosition(position);
          return position;
        }
        console.log(
          "No match for " +
            seed.name +
            " at zoom " +
            zoom +
            " (" +
            rows.length +
            " vessels)",
        );
      }

      return null;
    } catch (err) {
      console.error("Could not read a position from Marinetraffic:", err);
      return null;
    } finally {
      await this.closeBrowser();
    }
  };
}

export default Marinetraffic;
