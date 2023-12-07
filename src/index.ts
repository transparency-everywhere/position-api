#!/usr/bin/env ts-node
import dotenv from "dotenv";
import Server from "./classes/server";

dotenv.config();

const port = process.env.PORT || 5000;

const server = new Server(port);
