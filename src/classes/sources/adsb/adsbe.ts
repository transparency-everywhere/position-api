import Source from '../Source'

class ADSBExchange extends Source {
  parseLocation = async function (result: any) {
    const location = {
      timestamp: result.timestamp,
      latitude: result.latitude,
      longitude: result.longitude,
      course: result.course,
      speed: result.speed,
      raw: result.raw,
      source: 'adsbExchange',
      source_type: 'adsb'
    }
    return location
  }

  getLocation = async (icao: string) => {
    /// <reference lib="dom" />
    const fetch = (await import('node-fetch')).default
    const response = await fetch(
      `https://globe.adsbexchange.com/data/traces/${icao.slice(
        -2
      )}/trace_recent_${icao}.json`,
      {
        headers: {
          accept: 'application/json, text/javascript, */*; q=0.01',
          'accept-language': 'de-DE,de;q=0.9',
          'sec-ch-ua':
            '"Chromium";v="116", "Not)A;Brand";v="24", "Brave";v="116"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'sec-gpc': '1',
          'x-requested-with': 'XMLHttpRequest',
          Referer: 'https://globe.adsbexchange.com/?icao=39e68b',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        },
        body: undefined,
        method: 'GET'
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        console.error(`Data not found for ICAO: ${icao}`)
        return null // Return null or fallback data
      }
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      throw new Error(`Unexpected content type: ${contentType}`)
    }

    const body = await response.text()
    let bodyjson
    try {
      bodyjson = JSON.parse(body)
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Failed to parse JSON: ${err.message}`)
      } else {
        throw new Error('Failed to parse JSON: Unknown error')
      }
    }

    const data = bodyjson as { timestamp: any, trace: any } // Add this line

    const timestamp = data.timestamp
    const trace = data.trace
    const last_trace = trace[trace.length - 1]
    const [time_offset, lat, lon, alt_baro, ground_speed, ground_track] =
      last_trace
    const last_trace_timestamp = timestamp + time_offset
    const location = this.parseLocation({
      timestamp: last_trace_timestamp,
      latitude: lat,
      longitude: lon,
      course: ground_track,
      speed: ground_speed, // knots
      altitude: alt_baro,
      raw: bodyjson
    })
    return await location
  }

  getLocationFull = async (icao: string) => {
    /// <reference lib="dom" />
    const fetch = (await import('node-fetch')).default
    const response = await fetch(
      `https://globe.adsbexchange.com/data/traces/${icao.slice(
        -2
      )}/trace_full_${icao}.json`,
      {
        headers: {
          accept: 'application/json, text/javascript, */*; q=0.01',
          'accept-language': 'de-DE,de;q=0.9',
          'sec-ch-ua':
            '"Chromium";v="116", "Not)A;Brand";v="24", "Brave";v="116"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'sec-gpc': '1',
          'x-requested-with': 'XMLHttpRequest',
          Referer: 'https://globe.adsbexchange.com/?icao=39e68b',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        },
        body: undefined,
        method: 'GET'
      }
    )
    const body = await response.text()
    const bodyjson = JSON.parse(body)
    const data = bodyjson as { timestamp: any, trace: any } // Add this line

    const timestamp = data.timestamp
    const trace = data.trace

    console.log(trace)
    const last_trace = trace[trace.length - 1]
    const [
      time_offset,
      lat,
      lon,
      alt_baro,
      ground_speed,
      unknown2,
      unknown3,
      unknown4,
      unknown5
    ] = last_trace
    console.log('check that lat and lon in correct order!!')
    console.log('last trace')
    console.log(last_trace)
    console.log('=========')
    const last_trace_timestamp = timestamp + time_offset
    console.log(last_trace_timestamp)
    console.log(new Date(last_trace_timestamp * 1000))
    console.log(
      time_offset,
      lat,
      lon,
      alt_baro,
      ground_speed,
      unknown2,
      unknown3,
      unknown4,
      unknown5
    )
  }
}

export default ADSBExchange
