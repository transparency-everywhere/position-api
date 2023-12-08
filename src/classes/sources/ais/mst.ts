import Source from "../Source";
class MyShipTracking extends Source {
  parseLocation = async function (result: any) {
    const location = {
      timestamp: result.timestamp,
      latitude: result.latitude,
      longitude: result.longitude,
      course: result.course,
      speed: result.speed,
      source: "myshiptracking.com",
      source_type: "AIS",
    };
    return location;
  };

  // the method in the sources class does not work if no seconds are in the string
  dmsToDecimalDegreesMST = function (dms) {
    console.log(dms);
    return parseFloat(dms);
  };

  getLocation = async (mmsi: number) => {
    const result = await this.fetch(
      "https://www.myshiptracking.com/vessels/mmsi-310627000",
      {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "de-DE,de;q=0.6",
        "cache-control": "max-age=0",
        "sec-ch-ua":
          '"Chromium";v="116", "Not)A;Brand";v="24", "Brave";v="116"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "sec-gpc": "1",
        "upgrade-insecure-requests": "1",
        cookie:
          "usr_lang_exist=1; port_tz=LT; user_tz=MT; user_df=1; session_id_sp_trk=fd1i0pb2mt6i4nra9c1mejsmvk; offset=Europe%2FBerlin; usr_lang_exist=1; io=ilOBwd-Xh9Z1fGzpFaM0",
      },
      "GET",
    );
    const pattern =
      /<th>(Longitude|Latitude|Course|Speed|Position Received)<\/th>\s*<td>(.*?)<\/td>/g;
    const extractedData: any = {};
    let match, parsedDate;

    while ((match = pattern.exec(result)) !== null) {
      const key = match[1];
      const value = match[2];
      extractedData[key] = value;
    }

    console.log(extractedData["Position Received"]);
    console.log(123);

    // Extract the date and time string using regular expression
    const regex = /title="([^"]+)"/;
    const matchd = extractedData["Position Received"].match(regex);

    if (matchd?.[1]) {
      const dateTimeString = matchd[1];

      // Parse the extracted date and time string
      const [datePart, timePart] = dateTimeString.split(" ");
      const [year, month, day] = datePart.split("-");
      const [hour, minute] = timePart.split(":");

      // JavaScript months are 0-based, so subtract 1 from the month
      parsedDate = new Date(year, month - 1, day, hour, minute);

      console.log(parsedDate); // This will log the parsed date object
    } else {
      console.log("Date not found in the input string.");
    }

    const position = {
      latitude: this.dmsToDecimalDegreesMST(extractedData.Latitude),
      longitude: this.dmsToDecimalDegreesMST(extractedData.Longitude),
      course: 10,
      speed: parseFloat(extractedData.Speed),
      timestamp: new Date(parsedDate).toISOString(),
    };
    console.log(position);
    return position;
  };
}

export default MyShipTracking;
