const puppeteer = require('puppeteer')
const scrapeJsonFromResponse = async (options, cb) => {
  const browser = await puppeteer.launch({
    args: [
      // Required for Docker version of Puppeteer
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // This will write shared memory files into /tmp instead of /dev/shm,
      // because Docker’s default for /dev/shm is 64MB
      '--disable-dev-shm-usage'
    ]
  })
  const page = await browser.newPage()
  await page.setExtraHTTPHeaders({
    'x-requested-with': 'XMLHttpRequest',
    referer: options.referer,
    ...options.extraHeaders
  })
  page.on('request', (interceptedRequest) => {
    const reqUrl = interceptedRequest.url()
    console.log('A request was started: ', reqUrl)
  })
  page.on('requestfinished', async (request) => {
    const resUrl = request.url()
    if (resUrl.indexOf(options.responseSelector) !== -1) {
      const response = request.response()
      const json = await response.json()
      console.log('A response was received: ', await response.url())
      cb(json)
    }
  })
  // Mock real desktop chrome
  page.setViewport({
    height: 1302,
    width: 2458
  })
  page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'
  )
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'languages', {
      get: function () {
        return ['en-US', 'en', 'de-DE']
      }
    })
    Object.defineProperty(navigator, 'plugins', {
      get: function () {
        // this just needs to have `length > 0`, but we could mock the plugins too
        return [1, 2, 3, 4, 5]
      }
    })
  })

  await page.goto(options.url, { waitUntil: 'networkidle0' })

  const browserVersion = await browser.version()

  await browser.close()
}

module.exports = {
  fetch: scrapeJsonFromResponse
}
