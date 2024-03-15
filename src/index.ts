#!/usr/bin/env ts-node
import dotenv from 'dotenv'
import Server from './classes/server'

dotenv.config()

const port = process.env.PORT ?? 5000
// eslint-disable-next-line no-new
new Server(port)
