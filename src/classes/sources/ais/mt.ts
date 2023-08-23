import Source from "../Source";
class Marinetraffic extends Source{
    parseLocation = async function(result:object){
        let location = {
            timestamp: new Date(result.values.last_pos).toISOString(),
            latitude: result.values.ship_lat,
            longitude:result.values.ship_lon,
            course: result.values.course,
            speed: result.values.speed,
            source: 'Marinetraffic',
            source_type: 'AIS',
            raw_data: result.values
        }
        return location;
    }
    getLocation = async (mmsi:Number) =>{
        let result = await this.fetch("https://www.marinetraffic.com/de/ais/get_info_window_json?asset_type=ship&id=371681",
        {
            "accept": "application/json, text/plain, */*",
            "sec-ch-ua": "\"Not/A)Brand\";v=\"99\", \"Brave\";v=\"115\", \"Chromium\";v=\"115\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "vessel-image": "004c895bc2c866751982799a1da126bafb27",
            "x-requested-with": "XMLHttpRequest",
            "Referer": "https://www.marinetraffic.com/de/ais/home/centerx:-51.7/centery:45.5/zoom:10",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "GET"
        )
        return this.parseLocation(result);
    }
}

export default Marinetraffic;