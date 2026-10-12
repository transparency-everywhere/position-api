import fetch from "node-fetch";
import { addExtra } from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { importEsm } from "../../lib/esm";

// puppeteer is ESM-only, so it cannot be resolved by puppeteer-extra's own
// internal require("puppeteer"). Import it explicitly and hand the instance to
// addExtra() instead, lazily so that merely importing this module stays cheap.
let puppeteerPromise: Promise<any> | null = null;
const getPuppeteer = async (): Promise<any> => {
  if (puppeteerPromise === null) {
    puppeteerPromise = importEsm("puppeteer").then((mod) => {
      const instance = addExtra(mod.default);
      instance.use(StealthPlugin());
      return instance;
    });
  }
  return await puppeteerPromise;
};

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
      typeof position.latitude !== "number" ||
      typeof position.longitude !== "number" ||
      isNaN(position.latitude) ||
      isNaN(position.longitude) ||
      position.latitude < -90 ||
      position.latitude > 90 ||
      position.longitude < -180 ||
      position.longitude > 180
    ) {
      throw new Error(
        "Invalid position: must have numeric latitude (-90..90) and longitude (-180..180)",
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
      // No --user-agent override: it used to claim Chrome 90 on Windows while
      // the bundled browser is a current Chrome on this host, which contradicts
      // every other signal a site sees and overrides the consistent user agent
      // the stealth plugin installs.
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ...(executablePath ? { executablePath } : {}),
    };
    console.log(JSON.stringify(launchOptions, null, 2));
    try {
      const puppeteer = await getPuppeteer();
      this.browser = await puppeteer.launch(launchOptions);
      console.log("[PUPPETEER] Browser launched successfully");
    } catch (err) {
      console.error("[PUPPETEER] Failed to launch browser:", err);
      throw err;
    }
    return this.browser;
  };

  /**
   * Closes the cached browser (if any) and clears the handle, so that a later
   * getBrowser() call launches a fresh instance instead of handing back a
   * closed one. Every request builds its own source instance, so callers must
   * close the browser or each request leaks a Chrome process.
   */
  closeBrowser: any = async () => {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (err) {
        console.error("[PUPPETEER] Failed to close browser:", err);
      }
      this.browser = false;
    }
  };

  /**
   * Loads a URL in a real (stealth) browser and returns the rendered HTML.
   * Needed for sources behind a bot check, which answer a plain fetch with an
   * interstitial challenge page rather than the content.
   */
  fetchRendered: any = async (url: string, timeout: number = 60000) => {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout });
      // Bound before returning so the page is read before finally closes it.
      const html = await page.content();
      return html;
    } finally {
      await page.close();
    }
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
