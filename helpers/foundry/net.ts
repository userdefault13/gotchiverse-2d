import { Room } from 'colyseus.js';
import { fetchFoundryConfig } from './config';
import * as FoundryStore from './store';

let colyseusRoom: Room | null = null;

function usingColyseus(): boolean {
  return Boolean(colyseusRoom);
}

function send(type: string, payload: Record<string, unknown> = {}): void {
  colyseusRoom?.send(type, payload);
}

export const FoundryNet = {
  async init(apiBase?: string): Promise<void> {
    const remote = await fetchFoundryConfig(apiBase);
    if (remote) FoundryStore.applyRemoteConfig(remote);
  },

  attachRoom(room: Room | null): void {
    colyseusRoom = room;
  },

  gather(nodeId: string): { ok: boolean; message: string } {
    if (usingColyseus()) {
      send('foundry.gather', { nodeId });
      return { ok: true, message: 'Gather sent' };
    }
    return FoundryStore.gatherFromNode(nodeId);
  },

  deposit(): { ok: boolean; message: string } {
    if (usingColyseus()) {
      send('foundry.deposit');
      return { ok: true, message: 'Deposit sent' };
    }
    return FoundryStore.depositAtReceiver();
  },

  placeAntenna(x: number, y: number): { ok: boolean; message: string } {
    if (usingColyseus()) {
      send('foundry.placeAntenna', { x, y });
      return { ok: true, message: 'Place antenna sent' };
    }
    return FoundryStore.placeAntenna(x, y);
  },

  bounceFreight(): { ok: boolean; message: string } {
    if (usingColyseus()) {
      send('foundry.bounceFreight');
      return { ok: true, message: 'Bounce sent' };
    }
    return FoundryStore.bounceFreight();
  },

  meshTransfer(): { ok: boolean; message: string } {
    if (usingColyseus()) {
      send('foundry.meshTransfer');
      return { ok: true, message: 'Mesh transfer sent' };
    }
    return FoundryStore.meshTransfer();
  },

  factionPulse(): { ok: boolean; message: string } {
    if (usingColyseus()) {
      send('foundry.damageAntenna', { amount: 25 });
      return { ok: true, message: 'Raid sent' };
    }
    return FoundryStore.factionPulse();
  },

  craftRecipe(recipeId: string): { ok: boolean; message: string } {
    if (usingColyseus()) {
      send('foundry.craftRecipe', { recipeId });
      return { ok: true, message: 'Craft sent' };
    }
    return FoundryStore.craftRecipe(recipeId);
  },

  purchaseSalvage(kitId: string): { ok: boolean; message: string } {
    if (usingColyseus()) {
      send('foundry.purchaseAntenna', { kitId });
      return { ok: true, message: 'Purchase sent' };
    }
    return { ok: false, message: 'Antenna kit requires Colyseus' };
  },

  hitEnemy(enemyId: string): { ok: boolean; message: string } {
    if (usingColyseus()) {
      send('foundry.hitEnemy', { enemyId });
      return { ok: true, message: 'Attack sent' };
    }
    return FoundryStore.hitEnemy(enemyId);
  },
};

export default FoundryNet;
