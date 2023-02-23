# locationsource

Solution to access machine readable AIS Data. This solution uses the free web solutions to crawl the data and returns them in json.

As this repo is a successor to the ais-api, lecacy parts are added (see legacy) Those will be removed in future versions.


## How to use

### Paths

#### /:sourcetype/:source/:vehicleidentifier/location/latest
find latest position for vehicle for specified sourcetype and source
example: http://localhost:5000/ais/mt/211281610/location/latest

#### /:source/:placeidentifier/vehicles/

#### /:source/area/vehicles

### Legacy Paths

As this repo is a successor to the ais-api, some legacy paths are added. Those will be removed in future versions


#### /legacy/getLastPosition/:mmsi

Takes position from MT and from VT and returns the newest
example: http://localhost:5000/legacy/getLastPosition/211281610

#### /legacy/getLastPositionFromVF/:mmsi

Returns position from VF
example: http://localhost:5000/legacy/getLastPositionFromVF/211281610

#### /legacy/getLastPositionFromMT/:mmsi

Returns position from MT
example: http://localhost:5000/legacy/getLastPositionFromMT/211281610

#### /legacy/getVesselsInArea/:area

Returns all vessels in area, defined by a list of area keywords
example: http://localhost:5000/legacy/getVesselsInArea/WMED,EMED

#### /legacy/getVesselsNearMe/:lat/:lng/:distance

Returns all vessels near me, defined by a location in latitude, longitude, and distance
example: http://localhost:5000/legacy/getVesselsNearMe/51.74190/3.89773/2

```Javascript
[{
  name: vessel.SHIPNAME,
  id: vessel.SHIP_ID,
  lat: Number(vessel.LAT),
  lon: Number(vessel.LON),
  timestamp: vessel.LAST_POS,
  mmsi: vessel.MMSI,
  imo: vessel.IMO,
  callsign: vessel.CALLSIGN,
  speed: Number(vessel.SPEED),
  area: vessel.AREA_CODE,
  type: vessel.TYPE_SUMMARY,
  country: vessel.COUNTRY,
  destination: vessel.DESTINATION,
  port_current_id: vessel.PORT_ID,
  port_current: vessel.CURRENT_PORT,
  port_next_id: vessel.NEXT_PORT_ID,
  port_next: vessel.NEXT_PORT_NAME,
},…]
```

#### /legacy/getVesselsInPort/:shipPort

Returns all vessels in a port, named after the MT nomenclature
example: http://localhost:5000/legacy/getVesselsInPort/piraeus

Output format identical to **getVesselsInArea**

## Install on local machine

Requirements: npm & nodejs.

1. clone this repo

2. run `npm install`

3. run `npm run dev`

