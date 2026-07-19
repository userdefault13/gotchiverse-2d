import { fetchFoundryConfig } from './config';
import * as FoundryStore from './store';

type RoomLike = {
  send: (type: string, data?: Record<string, unknown>) => void;
};

/**
 * Bridges Foundry PoC to Colyseus when a room is available; otherwise localStorage store.
 */
export const FoundryNet = {
  room: null as RoomLike | null,
  usingColyseus: false,

  async init(apiBase?: string) {
    const remote = await fetchFoundryConfig(apiBase || process.env.NEXT_PUBLIC_API_URL);
    if (remote?.enableParcelFoundryPoC) {
      FoundryStore.applyRemoteConfig(remote);
    } else if (process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC === 'true') {
      FoundryStore.setFoundryEnabled(true);
    }
  },

  attachRoom(room: RoomLike | null) {
    this.room = room;
    this.usingColyseus = Boolean(room) && process.env.NEXT_PUBLIC_NETCODE === 'colyseus';
  },

  gather(nodeId: string) {
    if (this.usingColyseus && this.room) {
      this.room.send('foundry.gather', { nodeId });
      return { ok: true, message: 'Gather requested' };
    }
    return FoundryStore.gatherFromNode(nodeId);
  },

  deposit() {
    if (this.usingColyseus && this.room) {
      this.room.send('foundry.deposit', {});
      return { ok: true, message: 'Deposit requested' };
    }
    return FoundryStore.depositAtReceiver();
  },

  bounceFreight() {
    if (this.usingColyseus && this.room) {
      this.room.send('foundry.bounceFreight', {});
      return { ok: true, message: 'Bounce Freight requested' };
    }
    return FoundryStore.bounceFreight();
  },

  placeAntenna(x: number, y: number) {
    if (this.usingColyseus && this.room) {
      this.room.send('foundry.placeAntenna', { x, y });
      return { ok: true, message: 'Antenna place requested' };
    }
    return FoundryStore.placeAntenna(x, y);
  },

  meshTransfer(from?: { x: number; y: number }) {
    if (this.usingColyseus && this.room) {
      this.room.send('foundry.meshTransfer', from || {});
      return { ok: true, message: 'Mesh transfer requested' };
    }
    return FoundryStore.meshTransfer(from);
  },

  factionPulse() {
    if (this.usingColyseus && this.room) {
      const ants = FoundryStore.getState().antennas;
      const target = ants.find((a) => a.powered && a.hp > 0);
      if (target) this.room.send('foundry.damageAntenna', { antennaId: target.id, amount: 25 });
      return { ok: true, message: 'Faction damage requested' };
    }
    return FoundryStore.factionPulse();
  },
};
