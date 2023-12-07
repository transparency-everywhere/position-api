const scraper = require('./lib/puppeteer')

const fetchResultByArea = async (area, time, cb) => {
  const result = await scraper.fetch(
    {
      url: `https://www.marinetraffic.com/en/reports?asset_type=vessels&columns=time_of_latest_position:desc,flag,shipname,photo,recognized_next_port,reported_eta,reported_destination,current_port,imo,ship_type,show_on_live_map,area,lat_of_latest_position,lon_of_latest_position&area_in=${area}&time_of_latest_position_between=${time}`,
      referer:
        'https://www.marinetraffic.com/en/data/?asset_type=vessels&columns=time_of_latest_position:desc,flag,shipname,photo,recognized_next_port,reported_eta,reported_destination,current_port,imo,ship_type,show_on_live_map,area,lat_of_latest_position,lon_of_latest_position&area_in|in|West%20Mediterranean,East%20Mediterranean|area_in=WMED,EMED&time_of_latest_position_between|gte|time_of_latest_position_between=60,525600',
      responseSelector: '/en/reports?',
      extraHeaders: {
        'vessel-image': '0053e92efe9e7772299d24de2d0985adea14'
      }
    },
    cb
  )
}

const mapResult = (result) => {
  return result.data.map((vessel) => ({
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
}

const fetchVesselsInArea = (regions = ['WMED', 'EMED'], cb) => {
  const timeframe = [60, 525600]
  fetchResultByArea(regions.join(','), timeframe.join(','), (result) => {
    if (!result?.data.length) {
      return cb(null)
    }
    return cb(mapResult(result))
  })
}

const fetchResultNearMe = async (lat, lng, distance, time, cb) => {
  const result = await scraper.fetch(
    {
      url: `https://www.marinetraffic.com/en/reports?asset_type=vessels&columns=time_of_latest_position:desc,flag,shipname,photo,recognized_next_port,reported_eta,reported_destination,current_port,imo,ship_type,show_on_live_map,area,lat_of_latest_position,lon_of_latest_position&time_of_latest_position_between=${time}&near_me=${lat},${lng},${distance}`,
      referer:
        'https://www.marinetraffic.com/en/data/?asset_type=vessels&columns=time_of_latest_position:desc,flag,shipname,photo,recognized_next_port,reported_eta,reported_destination,current_port,imo,ship_type,show_on_live_map,area,lat_of_latest_position,lon_of_latest_position&area_in|in|West%20Mediterranean,East%20Mediterranean|area_in=WMED,EMED&time_of_latest_position_between|gte|time_of_latest_position_between=60,525600',
      responseSelector: '/en/reports?',
      extraHeaders: {
        'vessel-image': '0053e92efe9e7772299d24de2d0985adea14'
      }
    },
    cb
  )
}

const fetchVesselsNearMe = (lat = 51.7419, lng = 3.89773, distance = 2, cb) => {
  const timeframe = [60, 525600]
  fetchResultNearMe(lat, lng, distance, timeframe.join(','), (result) => {
    if (!result?.data.length) {
      return cb(null)
    }
    return cb(mapResult(result))
  })
}

export class areaApi {
  static fetchVesselsInArea = fetchVesselsInArea
  static fetchVesselsNearMe = fetchVesselsNearMe
}
