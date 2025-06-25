# Position API

A Node.js/TypeScript API for retrieving real-time positions of vessels and aircraft from various sources, including MarineTraffic (AIS) and ADS-B Exchange.

## Features

- Fetch latest vessel positions by MMSI from MarineTraffic.
- Fetch latest aircraft positions by ICAO from ADS-B Exchange.
- Legacy endpoints for compatibility.
- Area and port-based vessel queries.
- Puppeteer-based scraping with stealth plugin for anti-bot evasion.

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

```bash
git clone https://github.com/transparency-everywhere/position-api.git
cd position-api
npm install
```

### Configuration

Copy the environment template and adjust as needed:

```bash
cp .env.template .env
```

### Build

```bash
npm run build
```

### Run

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## API Endpoints

### Vessel Position

- `GET /ais/mt/:mmsi/location/latest`  
  Get latest position for a vessel by MMSI.

### Aircraft Position

- `GET /adsb/adsbe/:icao/location/latest`  
  Get latest position for an aircraft by ICAO code.

### Legacy Endpoints

- `/legacy/getLastPositionFromVF/:mmsi`
- `/legacy/getLastPositionFromMT/:mmsi`
- `/legacy/getLastPosition/:mmsi`
- `/legacy/getVesselsInArea/:area`
- `/legacy/getVesselsNearMe/:lat/:lng/:distance`
- `/legacy/getVesselsInPort/:shipPort`

## Development

- Lint code: `npm run lint`
- Format code: `npm run prettier`
- Run tests: `npm test`

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

[ISC](LICENSE)

---

*Powered by Node.js, Express, Puppeteer, and TypeScript.*
curl http://localhost:5000/legacy/getVesselsInArea/WMED,EMED

# Legacy: Get vessels near a location
curl http://localhost:5000/legacy/getVesselsNearMe/37.7749/-122.4194/10

# Legacy: Get vessels in port
curl http://localhost:5000/legacy/getVesselsInPort/Hamburg
```

---

## Notes

- All endpoints return JSON.
- Replace `localhost:5000` with your server's address and port if different.
- Pull requests and issues are welcome!

---

## Notes

- All endpoints return JSON.
- Replace `localhost:5000` with your server's address and port if different.
- Pull requests and issues are welcome!

---
- **Get latest location by ICAO**
  ```
  GET /adsb/adsbe/:icao/location/latest
  ```
  **Example:**
  ```
  curl http://localhost:5000/adsb/adsbe/abc123/location/latest
  ```

### Legacy Vessel Routes

- **Get last position from MST (replaces VF)**
  ```
  GET /legacy/getLastPositionFromVF/:mmsi
  ```
  **Example:**
  ```
  curl http://localhost:5000/legacy/getLastPositionFromVF/211879870
  ```

- **Get last position from Marinetraffic**
  ```
  GET /legacy/getLastPositionFromMT/:mmsi
  ```
  **Example:**
  ```
  curl http://localhost:5000/legacy/getLastPositionFromMT/211879870
  ```

- **Get last position (default)**
  ```
  GET /legacy/getLastPosition/:mmsi
  ```
  **Example:**
  ```
  curl http://localhost:5000/legacy/getLastPosition/211879870
  ```

- **Get vessels in area**
  ```
  GET /legacy/getVesselsInArea/:area
  ```
  - `:area` is a comma-separated list, e.g. `WMED,EMED`
  **Example:**
  ```
  curl http://localhost:5000/legacy/getVesselsInArea/WMED,EMED
  ```

- **Get vessels near me**
  ```
  GET /legacy/getVesselsNearMe/:lat/:lng/:distance
  ```
  **Example:**
  ```
  curl http://localhost:5000/legacy/getVesselsNearMe/37.7749/-122.4194/10
  ```

- **Get vessels in port**
  ```
  GET /legacy/getVesselsInPort/:shipPort
  ```
  **Example:**
  ```
  curl http://localhost:5000/legacy/getVesselsInPort/Hamburg
  ```

## Notes

- All endpoints return JSON.
- Replace `localhost:5000` with your server's address and port if different.



