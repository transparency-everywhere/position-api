import Source from "../Source";
class Marinetraffic extends Source{
    parseLocation = async function(result:object){
        let location = {
            timestamp: result.timestamp,
            latitude: result.latitude,
            longitude: result.longitude,
            course: result.course,
            speed: result.speed,
            source: 'Marinetraffic',
            source_type: 'AIS'
        }
        return location;
    }
    getLocation = async (mmsi:Number) =>{



        async function autoScroll(page) {
            await page.evaluate(async () => {
              await new Promise((resolve, reject) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                  const scrollHeight = document.body.scrollHeight;
                  window.scrollBy(0, distance);
                  totalHeight += distance;
          
                  if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                  }
                }, 100);
              });
            });
          }


        let browser = await this.getBrowser();
        const page = await browser.newPage();
        
        const url = 'https://www.marinetraffic.com/en/ais/details/ships/mmsi:310627000';
        await page.goto(url);
      
        await page.waitForSelector('#vesselDetails_summarySection');
      
        // Scroll to the bottom of the page
        await autoScroll(page);
      
          const textContent_course = await page.$eval('#vesselDetails_latestPositionSection', div => div.textContent);
      
          const courseRegex = /Speed\/Course: (\d+\.\d+) kn \/ (\d+) °/;
          const course_match = textContent_course.match(courseRegex);
          let course,timestamp,latitude,longitude,speed;
      
          if (course_match) {
            course = parseFloat(course_match[2]);
          } else {
              throw new Error("could not parse course from marinetraffic");
          }
          console.log("course",course);
      
          const timestampRegex = /Position Received: (\d{4}-\d{2}-\d{2} \d{2}:\d{2} \D{2}  \D{3})/;
          const match_time = textContent_course.match(timestampRegex);
          if (match_time) {
              timestamp = match_time[1].replace("LT","");
              console.log(timestamp)
          } else {
              throw  new Error("Could not parse timestamp from marinetraffic");
          }
      
          const textContent_pos = await page.$eval('#vesselDetails_summarySection', div => div.textContent);
            
            
          const regex_pos = /position (\d+° \d+' \d+\.\d+" [NS]), (\d+° \d+' \d+\.\d+" [EW])/;
          const matches = textContent_pos.match(regex_pos);
          if (matches && matches.length === 3) {
              latitude = matches[1];
              longitude = matches[2];
      
              console.log("Latitude:", latitude);
              console.log("Longitude:", longitude);
          } else {    
              throw  new Error("could not parse location from marinetraffic")
          }
        
          const speedRegex = /currently sailing at ([\d.]+) knots/;
          const speedMatch = textContent_pos.match(speedRegex);
          
          if (speedMatch && speedMatch.length === 2) {
            speed = parseFloat(speedMatch[1]);
          
            console.log("Speed:", speed, "knots");
          } else {
              throw  new Error("Speed not found in the text.");
          }
      
      
        await browser.close();
        const result = {
            course:parseFloat(course),
            speed:parseFloat(speed),
            latitude:this.convertRawCoordinatesIntoDecimal(latitude),
            longitude:this.convertRawCoordinatesIntoDecimal(longitude),
            timestamp:new Date(timestamp).toISOString()

        }
        console.log(result);
        return this.parseLocation(result);
    }
}

export default Marinetraffic;