import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { env } from './config/env';
import { createHttpRouter } from './http/routes';
import { CitaadelRoom } from './rooms/CitaadelRoom';

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow Vercel preview deployments when a wildcard suffix is configured
      const ok = env.corsOrigins.some((allowed) => {
        if (allowed.startsWith('*.')) {
          return origin.endsWith(allowed.slice(1));
        }
        return false;
      });
      return callback(ok ? null : new Error(`CORS blocked for origin ${origin}`), ok);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(createHttpRouter());

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
  }),
});

gameServer.define('citaadel', CitaadelRoom);

server.listen(env.port, env.host, () => {
  console.log(`[realm-server] HTTP+Colyseus listening on ${env.host}:${env.port}`);
  console.log(`[realm-server] publicUrl=${env.publicUrl}`);
  console.log(`[realm-server] cors=${env.corsOrigins.join(',')}`);
});
