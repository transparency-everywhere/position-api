import Source from "../Source";

class MyShipTracking extends Source {
  parseLocation = async function (result: any) {
    const location = {
      timestamp: result.timestamp,
      latitude: result.latitude,
      longitude: result.longitude,
      course: result.course,
      speed: result.speed,
      source: "myshiptracking.com",
      source_type: "AIS",
    };
    return location;
  };

  // the method in the sources class does not work if no seconds are in the string
  dmsToDecimalDegreesMST = function (dms) {
    return parseFloat(dms);
  };

  /**
   * Reads the "<th>Label</th><td>value</td>" rows of the vessel detail table.
   * Coordinates are withheld from this table for anonymous visitors (they are
   * rendered as "---"), so it is only used for the fields that do carry data.
   */
  extractTableFields = function (html: string) {
    const pattern =
      /<th>(Longitude|Latitude|Course|Speed|Position Received)<\/th>\s*<td>(.*?)<\/td>/g;
    const fields: any = {};
    let match;
    while ((match = pattern.exec(html)) !== null) {
      if (fields[match[1]] === undefined) {
        fields[match[1]] = match[2];
      }
    }
    return fields;
  };

  /**
   * The page carries a plain-language summary of the last AIS report, e.g.
   *   "... with coordinates 33.22338° / 14.39467° as reported on
   *    2026-10-09 17:11 ... The vessel's current speed is 2.6 Knots ..."
   * That sentence is the only place where the exact position is published, so
   * it is the primary source here and the table is used for the rest.
   */
  extractSummary = function (html: string) {
    const name = html.match(
      /The current position of\s*<strong>\s*([^<]+?)\s*<\/strong>/i,
    );
    const coordinates = html.match(
      /coordinates\s*<strong>\s*(-?\d+(?:\.\d+)?)°\s*\/\s*(-?\d+(?:\.\d+)?)°\s*<\/strong>/i,
    );
    const reportedAt = html.match(
      /as reported on\s*<strong>\s*(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?)\s*<\/strong>/i,
    );
    const speed = html.match(
      /current speed is\s*<strong>\s*(-?\d+(?:\.\d+)?)\s*Knots?\s*<\/strong>/i,
    );
    return {
      name: name?.[1],
      latitude: coordinates ? parseFloat(coordinates[1]) : NaN,
      longitude: coordinates ? parseFloat(coordinates[2]) : NaN,
      reportedAt: reportedAt?.[1],
      speed: speed ? parseFloat(speed[1]) : NaN,
    };
  };

  /**
   * "2026-10-09 17:11" is reported in UTC; Date.parse needs the explicit zone
   * to avoid reading it as the server's local time.
   */
  parseReportedAt = function (reportedAt?: string) {
    if (!reportedAt) {
      return undefined;
    }
    const isoLike = reportedAt.replace(" ", "T");
    const withSeconds = /T\d{2}:\d{2}$/.test(isoLike)
      ? isoLike + ":00"
      : isoLike;
    const parsed = new Date(withSeconds + "Z");
    return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  };

  /**
   * The position plus the vessel's name. Marinetraffic publishes no MMSI with
   * its positions and can only be queried by area, so it needs a name and a
   * place to start looking — see src/classes/sources/ais/mt.ts.
   */
  getVessel = async (mmsi: number) => {
    return await this.readVessel(mmsi);
  };

  getLocation = async (mmsi: number) => {
    const vessel = await this.readVessel(mmsi);
    const { name, ...position } = vessel;
    return position;
  };

  readVessel = async (mmsi: number) => {
    const url = "https://www.myshiptracking.com/vessels/mmsi-" + mmsi;
    try {
      // myshiptracking.com sits behind a bot check that answers a plain fetch
      // with a challenge page, so the page is rendered in a real browser.
      const html = await this.fetchRendered(url);
      const fields = this.extractTableFields(html);
      const summary = this.extractSummary(html);

      const speed = !isNaN(summary.speed)
        ? summary.speed
        : parseFloat(fields.Speed);
      const course = parseFloat(fields.Course);
      const timestamp = this.parseReportedAt(summary.reportedAt);

      if (timestamp === undefined) {
        throw new Error(
          "Could not read the AIS report time for MMSI " +
            mmsi +
            " from myshiptracking.com",
        );
      }

      const position = {
        name: summary.name,
        latitude: summary.latitude,
        longitude: summary.longitude,
        course: isNaN(course) ? 0 : course,
        speed: isNaN(speed) ? 0 : speed,
        timestamp,
      };
      this.verifyPosition(position);
      return position;
    } finally {
      await this.closeBrowser();
    }
  };
}

export default MyShipTracking;
