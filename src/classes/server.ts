import express from 'express'
import cors from 'cors'
import path from 'path'
import { api } from '../legacy/api'
import { areaApi } from '../legacy/area'
import ADSBexchange from './sources/adsb/adsbe'
class Server {
  app: any
  server: any
  constructor (port) {
    this.init(port)
  }

  init (port: number) {
    this.app = express()
    this.app.set('port', port)
    this.app.use(
      cors({
        origin: '*'
      })
    )
    this.app.get('/', (_request: any, response: any) => {
      response.sendFile(path.join(__dirname, '/../static/index.html'))
    })
    this.loadLegacyRoutes()
    this.loadRoutes()
    this.server = this.app.listen(this.app.get('port'), () => {
      console.log('Node this.appp is running on port', this.app.get('port'))
    })
  }

  close () {
    if (this.server) {
      this.server.close()
      console.log('Server closed')
    }
  }

  loadRoutes () {
    // /:sourcetype/:source/:vehicleidentifier/location/latest
    this.app.get(
      '/ais/mt/:mmsi/location/latest',
      async (req: any, res: any) => {
        try {
          api.getLocationFromMT(req.params.mmsi, (result) => {
            res.send({
              error: null,
              data: result
            })
          })
        } catch (error) {
          res.send({
            error: error || 'Unknown error',
            data: null
          })
        }
      }
    )
    this.app.get(
      '/adsb/adsbe/:icao/location/latest',
      async (req: any, res: any) => {
        console.log(req.params.icao)
        const adsbe = new ADSBexchange()
        const location = await adsbe.getLocation(req.params.icao)
        console.log(location)
        res.send({
          error: null,
          data: location
        })
      }
    )
  }

  loadLegacyRoutes () {
    // this route is wrongly named on purpose for legacy reasons.
    // AS VF is not as easy to reverse as the other ones, it is replaced by MST
    this.app.get(
      '/legacy/getLastPositionFromVF/:mmsi',
      (req: any, res: any) => {
        api.getLocationFromMST(req.params.mmsi, (result) => {
          res.send(result)
        })
      }
    )
    this.app.get(
      '/legacy/getLastPositionFromMT/:mmsi',
      (req: any, res: any) => {
        api.getLocationFromMT(req.params.mmsi, (result) => {
          res.send(result)
        })
      }
    )
    this.app.get('/legacy/getLastPosition/:mmsi', (req: any, res: any) => {
      api.getLocation(req.params.mmsi, (result) => {
        res.send(result)
      })
    })
    // e.g. /getVesselsInArea/WMED,EMED
    this.app.get(
      '/legacy/getVesselsInArea/:area',
      async (req: any, res: any) => {
        await areaApi.fetchVesselsInArea(
          req.params.area.split(','),
          (result) => {
            res.json(result)
          }
        )
      }
    )
    this.app.get(
      '/legacy/getVesselsNearMe/:lat/:lng/:distance',
      async (req: any, res: any) => {
        await areaApi.fetchVesselsNearMe(
          req.params.lat,
          req.params.lng,
          req.params.distance,
          (result) => {
            res.json(result)
          }
        )
      }
    )
    this.app.get('/legacy/getVesselsInPort/:shipPort', (req: any, res: any) => {
      api.getVesselsInPort(req.params.shipPort, (result) => {
        res.send(result)
      })
    })
  }
}

export default Server
