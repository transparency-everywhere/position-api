import fetch from "node-fetch";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

class Source {
  /**
   * Verifies that the given position object is valid according to the Position type.
   * Throws an error if the position is invalid.
   * @param position The position object to verify
   */
  verifyPosition(position: any): void {
    if (
      typeof position !== "object" ||
      position === null ||
      typeof position.lat !== "number" ||
      typeof position.lon !== "number" ||
      isNaN(position.lat) ||
      isNaN(position.lon) ||
      position.lat < -90 ||
      position.lat > 90 ||
      position.lon < -180 ||
      position.lon > 180
    ) {
      throw new Error(
        "Invalid position: must have numeric lat (-90..90) and lon (-180..180)",
      );
    }
  }

  browser: any;
  constructor() {
    this.browser = false;
  }

  getBrowser: any = async () => {
    if (this.browser) {
      console.log("[PUPPETEER] Returning existing browser instance");
      return this.browser;
    }
    console.log("[PUPPETEER] Launching browser with options:");
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    const launchOptions = {
      headless: true,
      defaultViewport: {
        width: 1280, // Width of a MacBook screen
        height: 1400, // Height of a MacBook screen
      },
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
      ],
      ...(executablePath ? { executablePath } : {}),
    };
    console.log(JSON.stringify(launchOptions, null, 2));
    try {
      this.browser = await puppeteer.launch(launchOptions);
      console.log("[PUPPETEER] Browser launched successfully");
    } catch (err) {
      console.error("[PUPPETEER] Failed to launch browser:", err);
      throw err;
    }
    return this.browser;
  };

  convertRawCoordinatesIntoDecimal(input): number {
    const grade = parseInt(input.substring(0, input.indexOf("°")));
    const rest = input.substring(input.indexOf("°") + 1);
    const minutes = parseInt(rest.substring(0, rest.indexOf("'")));
    const seconds = parseInt(
      rest.substring(rest.indexOf("'") + 1).split('"')[0],
    );
    return grade + (minutes + seconds / 60) / 60;
  }

  fetch = async function (url: string, headers: any, method: string) {
    const response = await fetch(url, {
      headers,
      body: undefined,
      method,
    });
    const text = await response.text();
    return text;
  };
}

export default Source;
