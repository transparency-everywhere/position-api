import Marinetraffic from '../classes/sources/ais/mt'
import MyShipTracking from '../classes/sources/ais/mst'

const moment = require('moment')
const request = require('request')

const debug = (...args) => {
  if (true) {
    console.log.apply(console, args)
  }
}

async function getLocationFromVF (mmsi, cb) {
  await getLocationFromMST(mmsi, cb)
}

async function getLocationFromMST (mmsi, cb) {
  const mst = new MyShipTracking()
  try {
    const location = await mst.getLocation(mmsi)
    console.log(location)
    cb({
      error: null,
      data: location
    })
  } catch (e) {
    cb({
      error: e,
      data: null
    })
  }
}

async function getLocationFromMT (mmsi, cb) {
  const mt = new Marinetraffic()

  try {
    const location = await mt.getLocation(mmsi)
    console.log(location)
    cb({
      error: null,
      data: location
    })
  } catch (e) {
    cb({
      error: e,
      data: null
    })
  }
}

function getLocation (mmsi, cb) {
  debug('getting location for vessel: ', mmsi)
  getLocationFromVF(mmsi, function (VFResult) {
    debug('got location from vf', VFResult)

    getLocationFromMT(mmsi, function (MTResult) {
      if (MTResult.error) {
        cb(VFResult)
      } else {
        debug('got location from mt', MTResult)
        if (!VFResult.data) {
          return cb(MTResult)
        }
        const vfDate = moment(VFResult.data.timestamp)
        const mtDate = moment(MTResult.data.timestamp)
        const secondsDiff = mtDate.diff(vfDate, 'seconds')
        debug('time diff in seconds: ', secondsDiff)

        cb(secondsDiff > 0 ? MTResult : VFResult)
      }
    })
  })
}

function getVesselsInPort (shipPort, cb) {
  const url = `https://www.marinetraffic.com/en/reports?asset_type=vessels&columns=flag,shipname,photo,recognized_next_port,reported_eta,reported_destination,current_port,imo,ship_type,show_on_live_map,time_of_latest_position,lat_of_latest_position,lon_of_latest_position,current_port_country,notes&current_port_in_name=${shipPort}`
  debug('getVesselsInPort', url)

  const headers = {
    accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, brotli',
    'Vessel-Image': '0053e92efe9e7772299d24de2d0985adea14',
    'X-Requested-With': 'XMLHttpRequest'
  }
  const options = {
    url,
    headers,
    json: true,
    gzip: true,
    deflate: true,
    brotli: true
  }
  request(options, function (error, response, html) {
    if (
      (!error && response.statusCode === 200) ||
      (typeof response !== 'undefined' && response.statusCode === 403)
    ) {
      return cb(
        response.body.data.map((vessel) => ({
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
          port_next: vessel.NEXT_PORT_NAME
        }))
      )
    } else {
      debug('error in getVesselsInPort')
      cb({ error: 'an unknown error occured' })
      return false
    }
  })
}

export class api {
  static getLocationFromVF = getLocationFromVF
  static getLocationFromMT = getLocationFromMT
  static getLocationFromMST = getLocationFromMST
  static getLocation = getLocation
  static getVesselsInPort = getVesselsInPort
}
