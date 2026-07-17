import { Room, Client } from 'colyseus';
import { CitaadelState } from '../schema/CitaadelState';
import { Player } from '../schema/Player';
import { verifyAuthToken } from '../auth/jwt';
import { assertGotchiOwnedBy } from '../auth/ownership';
import { MOVE, SPAWN } from '../config/env';

type JoinOptions = {
  token?: string;
  gotchiId?: string;
  name?: string;
};

type AuthData = {
  address: string;
  gotchiId: string;
};

function randomSpawn(): { x: number; y: number } {
  const x = SPAWN.minX + Math.random() * (SPAWN.maxX - SPAWN.minX);
  const y = SPAWN.minY + Math.random() * (SPAWN.maxY - SPAWN.minY);
  return { x: Math.round(x), y: Math.round(y) };
}

export class CitaadelRoom extends Room<CitaadelState> {
  maxClients = 200;
  private lastMoveAt = new Map<string, number>();

  onCreate() {
    this.setState(new CitaadelState());
    this.setMetadata({ mapId: 'citaadel' });

    this.onMessage('move', (client, message: { x?: number; y?: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (typeof message?.x !== 'number' || typeof message?.y !== 'number') return;
      if (!Number.isFinite(message.x) || !Number.isFinite(message.y)) return;

      const now = Date.now();
      const prevTime = this.lastMoveAt.get(client.sessionId) || now;
      const dt = Math.max(1, now - prevTime) / 1000;
      this.lastMoveAt.set(client.sessionId, now);

      let dx = message.x - player.x;
      let dy = message.y - player.y;
      const dist = Math.hypot(dx, dy);
      const maxDist = Math.min(MOVE.maxStepPx, MOVE.maxSpeedPxPerSec * dt);
      if (dist > maxDist && dist > 0) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }

      player.x = Math.round(player.x + dx);
      player.y = Math.round(player.y + dy);
    });

    this.onMessage('ping', (client) => {
      client.send('pong', { t: Date.now() });
    });
  }

  async onAuth(_client: Client, options: JoinOptions): Promise<AuthData> {
    if (!options?.token) {
      throw new Error('Missing auth token');
    }
    const claims = verifyAuthToken(options.token);
    const gotchiId = String(options.gotchiId || claims.gotchiId || '');
    if (!gotchiId) {
      throw new Error('Missing gotchiId');
    }
    await assertGotchiOwnedBy(claims.address, gotchiId);
    return { address: claims.address, gotchiId };
  }

  onJoin(client: Client, options: JoinOptions, auth?: AuthData) {
    const spawn = randomSpawn();
    const player = new Player();
    player.sessionId = client.sessionId;
    player.address = auth?.address || '';
    player.gotchiId = auth?.gotchiId || String(options.gotchiId || '');
    player.name = options.name || `Gotchi #${player.gotchiId}`;
    player.x = spawn.x;
    player.y = spawn.y;
    this.state.players.set(client.sessionId, player);
    this.lastMoveAt.set(client.sessionId, Date.now());
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.lastMoveAt.delete(client.sessionId);
  }
}
