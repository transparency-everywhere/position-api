import dotenv from 'dotenv';
import Server from './classes/server';

dotenv.config();

const port = process.env.PORT;

const server = new Server(port);
