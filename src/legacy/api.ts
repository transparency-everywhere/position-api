import Marinetraffic, { type VesselSeed } from "../classes/sources/ais/mt";
import MyShipTracking from "../classes/sources/ais/mst";

const moment = require("moment");
const request = require("request");

const debug = (...args) => {
  if (true) {
    console.log.apply(console, args);
  }
};

async function getLocationFromVF(mmsi, cb) {
  await getLocationFromMST(mmsi, cb);
}

/**
 * Reads the vessel from MyShipTracking. The result carries the vessel's name
 * next to the position, which is what Marinetraffic needs to start a search;
 * it is stripped again before the position is sent to a client.
 */
async function readVesselFromMST(mmsi) {
  const mst = new MyShipTracking();
  try {
    const vessel = await mst.getVessel(mmsi);
    console.log(vessel);
    return { error: null, vessel };
  } catch (e) {
    return { error: e, vessel: null };
  }
}

const withoutName = (vessel) => {
  if (!vessel) {
    return null;
  }
  const { name, ...position } = vessel;
  return position;
};

async function getLocationFromMST(mmsi, cb) {
  const { error, vessel } = await readVesselFromMST(mmsi);
  // Called outside the try on purpose: a throw from cb is the caller's own
  // failure and must not be reported back as a source error.
  cb({ error, data: withoutName(vessel) });
}

async function getLocationFromMT(mmsi, cb, seed: VesselSeed | null = null) {
  const mt = new Marinetraffic();
  let result;
  try {
    const location = await mt.getLocation(mmsi, seed);
    console.log(location);
    result = { error: null, data: location };
  } catch (e) {
    result = { error: e, data: null };
  }
  // See getLocationFromMST: the callback runs outside the try.
  cb(result);
}

/**
 * Asks both AIS sources and answers with the newer report. MyShipTracking is
 * read first and its vessel handed to Marinetraffic as the search seed, so
 * the lookup drives two browser sessions rather than three — Marinetraffic
 * would otherwise resolve the same vessel through MyShipTracking again.
 */
async function getLocation(mmsi, cb) {
  debug("getting location for vessel: ", mmsi);
  const mst = await readVesselFromMST(mmsi);
  const vfResult = { error: mst.error, data: withoutName(mst.vessel) };
  debug("got location from vf", vfResult);

  await getLocationFromMT(
    mmsi,
    function (mtResult) {
      if (mtResult.error) {
        return cb(vfResult);
      }
      debug("got location from mt", mtResult);
      if (!vfResult.data) {
        return cb(mtResult);
      }
      if (!mtResult.data) {
        return cb(vfResult);
      }
      const vfDate = moment(vfResult.data.timestamp);
      const mtDate = moment(mtResult.data.timestamp);
      const secondsDiff = mtDate.diff(vfDate, "seconds");
      debug("time diff in seconds: ", secondsDiff);

      cb(secondsDiff > 0 ? mtResult : vfResult);
    },
    mst.vessel,
  );
}

function getVesselsInPort(shipPort, cb) {
  const url = `https://www.marinetraffic.com/en/reports?asset_type=vessels&columns=flag,shipname,photo,recognized_next_port,reported_eta,reported_destination,current_port,imo,ship_type,show_on_live_map,time_of_latest_position,lat_of_latest_position,lon_of_latest_position,current_port_country,notes&current_port_in_name=${shipPort}`;
  debug("getVesselsInPort", url);

  const headers = {
    accept: "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, brotli",
    "Vessel-Image": "0053e92efe9e7772299d24de2d0985adea14",
    "X-Requested-With": "XMLHttpRequest",
  };
  const options = {
    url,
    headers,
    json: true,
    gzip: true,
    deflate: true,
    brotli: true,
  };
  request(options, function (error, response, html) {
    // The source answers a blocked scrape with an HTML error page, so the
    // payload may carry no "data" at all. Reading it unguarded threw inside
    // this callback, which took the whole process down.
    const vessels = response?.body?.data;
    if (
      ((!error && response?.statusCode === 200) ||
        response?.statusCode === 403) &&
      Array.isArray(vessels)
    ) {
      return cb(
        vessels.map((vessel) => ({
          name: vessel.SHIPNAME,
          id: vessel.SHIP_ID,
          lat: Number(vessel.LAT),
          lon: Number(vessel.LON),
          timestamp: vessel.LAST_POS,
          mmsi: vessel.MMSI,
          imo: vessel.IMO,
          callsign: vessel.CALLSIGN,
          speed: Number(vessel.SPEED),
          area: vessel.AREA_CODE,
          type: vessel.TYPE_SUMMARY,
          country: vessel.COUNTRY,
          destination: vessel.DESTINATION,
          port_current_id: vessel.PORT_ID,
          port_current: vessel.CURRENT_PORT,
          port_next_id: vessel.NEXT_PORT_ID,
          port_next: vessel.NEXT_PORT_NAME,
        })),
      );
    } else {
      debug("error in getVesselsInPort", error ?? response?.statusCode);
      cb({ error: "an unknown error occured" });
      return false;
    }
  });
}

export class api {
  static getLocationFromVF = getLocationFromVF;
  static getLocationFromMT = getLocationFromMT;
  static getLocationFromMST = getLocationFromMST;
  static getLocation = getLocation;
  static getVesselsInPort = getVesselsInPort;
}
