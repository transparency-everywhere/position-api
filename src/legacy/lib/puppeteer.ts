// puppeteer is ESM-only, so it is imported lazily inside the scraper instead of
// at module load time. That keeps requiring this module cheap and keeps it
// loadable from CommonJS consumers (such as the Jest test runner).
const { importEsm } = require("../../lib/esm");

const getPuppeteer = async (): Promise<any> =>
  (await importEsm("puppeteer")).default;

const scrapeJsonFromResponse = async (options, cb) => {
  // The callback has to run exactly once, and it has to run no matter how this
  // ends: the response handler may match several requests, nothing may match
  // at all, and launching the browser may fail outright. Leaving cb uncalled
  // left the HTTP request it belongs to without an answer, hanging until the
  // client gave up.
  let answered = false;
  const answer = (result) => {
    if (answered) {
      return;
    }
    answered = true;
    cb(result);
  };

  let browser;
  try {
    const puppeteer = await getPuppeteer();
    browser = await puppeteer.launch({
      args: [
        // Required for Docker version of Puppeteer
        "--no-sandbox",
        "--disable-setuid-sandbox",
        // This will write shared memory files into /tmp instead of /dev/shm,
        // because Docker’s default for /dev/shm is 64MB
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "x-requested-with": "XMLHttpRequest",
      referer: options.referer,
      ...options.extraHeaders,
    });
    page.on("requestfinished", async (request) => {
      const resUrl = request.url();
      if (resUrl.indexOf(options.responseSelector) === -1) {
        return;
      }
      // Anything thrown in here is an unhandled rejection inside an event
      // handler, which takes the whole process down, so nothing may escape.
      // A blocked scrape answers with an HTML error page rather than JSON.
      try {
        const response = request.response();
        const json = await response.json();
        console.log("A response was received: ", response.url());
        answer(json);
      } catch (err) {
        console.error("Could not read a JSON response from", resUrl, err);
      }
    });

    // Mock real desktop chrome
    await page.setViewport({
      height: 1302,
      width: 2458,
    });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36",
    );
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "languages", {
        get: function () {
          return ["en-US", "en", "de-DE"];
        },
      });
      Object.defineProperty(navigator, "plugins", {
        get: function () {
          // this just needs to have `length > 0`, but we could mock the plugins too
          return [1, 2, 3, 4, 5];
        },
      });
    });

    // networkidle0 can take a while on an ad-heavy page and may never be
    // reached at all, so the navigation is given an explicit ceiling.
    await page.goto(options.url, {
      waitUntil: "networkidle0",
      timeout: options.timeout ?? 45000,
    });
  } catch (err) {
    console.error("Could not scrape", options.url, err);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error("Could not close the browser:", err);
      }
    }
    // Either a matching JSON response already answered, or the source is
    // unreachable or answered with something else: report "no result" so the
    // caller always gets a reply.
    answer(null);
  }
};

module.exports = {
  fetch: scrapeJsonFromResponse,
};
