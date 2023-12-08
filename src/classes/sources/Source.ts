import fetch from 'node-fetch'
import puppeteer from 'puppeteer'

class Source {
  browser: any
  constructor () {
    this.browser = false
  }

  getBrowser: any = async () => {
    if (this.browser) {
      return this.browser
    }
    this.browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: {
        width: 1280, // Width of a MacBook screen
        height: 1400 // Height of a MacBook screen
      },

      // waitUntil: "domcontentloaded",
      args: [
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
      ]
    })
    return this.browser
  }

  convertRawCoordinatesIntoDecimal (input): number {
    const grade = parseInt(input.substring(0, input.indexOf('°')))
    const rest = input.substring(input.indexOf('°') + 1)
    const minutes = parseInt(rest.substring(0, rest.indexOf("'")))
    const seconds = parseInt(
      rest.substring(rest.indexOf("'") + 1).split('"')[0]
    )
    return grade + (minutes + seconds / 60) / 60
  }

  fetch = async function (url: string, headers: any, method: string) {
    const response = await fetch(url, {
      headers,
      body: undefined,
      method
    })
    const text = await response.text()
    return text
  }
}

export default Source
