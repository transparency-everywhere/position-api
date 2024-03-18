import Source from '../Source'
class Marinetraffic extends Source {
  parseLocation = async function (result: any) {
    const location = {
      timestamp: result.timestamp,
      latitude: result.latitude,
      longitude: result.longitude,
      course: result.course,
      speed: result.speed,
      source: 'Marinetraffic',
      source_type: 'AIS'
    }
    return location
  }

  getLocation = async (mmsi: number) => {
    const browser = await this.getBrowser()
    const page = await browser.newPage()

    const url =
      'https://www.marinetraffic.com/en/ais/details/ships/mmsi:' + mmsi
    await page.goto(url)
    // let parsedData = null;

    const waitForResponse = new Promise((resolve) => {
      page.on('response', async (response) => {
        const request = response.request()
        if (request.url().includes('latestPosition')) {
          const jsonresult = await response.text()
          const parsedData = JSON.parse(jsonresult)
          resolve(parsedData)
        }
      })
    })

    const parsedData: any = await waitForResponse
    browser.close()
    const result = {
      course: parseFloat(parsedData.course),
      speed: parseFloat(parsedData.speed),
      latitude: parseFloat(parsedData.lat),
      longitude: parseFloat(parsedData.lon),
      timestamp: new Date(parsedData.lastPos * 1000).toISOString() // assuming lastPos is in seconds
    }
    console.log('THIS IS THE VAR THAT GIVES THE TIMESTAMP' + parsedData.lastPos)
    return await this.parseLocation(result)
  }
}

export default Marinetraffic
