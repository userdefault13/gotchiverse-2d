import { FoundryNet } from './net';
import * as FoundryStore from './store';

/**
 * Call after joining a Colyseus `citaadel` room when NEXT_PUBLIC_NETCODE=colyseus.
 * Room must implement foundry.* messages from gotchiverse-realm-server Foundry patch.
 */
export function attachFoundryColyseusRoom(room: {
  send: (type: string, data?: Record<string, unknown>) => void;
  onMessage?: (type: string, cb: (msg: unknown) => void) => void;
  state?: {
    cargos?: Map<string, Record<string, number>>;
    antennas?: Map<string, Record<string, unknown>>;
  };
}) {
  FoundryNet.attachRoom(room);

  // Best-effort sync if schema maps are exposed on the client
  try {
    const cargos = room.state?.cargos;
    if (cargos && typeof (cargos as { forEach?: unknown }).forEach === 'function') {
      (cargos as Map<string, Record<string, number>>).forEach((cargo) => {
        FoundryStore.syncFromServerCargo({
          fud: cargo.fud,
          fomo: cargo.fomo,
          alpha: cargo.alpha,
          kek: cargo.kek,
          antenna: cargo.salvageAntenna,
          dish: cargo.salvageDish,
          slag: cargo.salvageSlag,
          titheAccrued: cargo.titheAccrued,
        });
      });
    }
  } catch {
    /* schema sync optional */
  }
}

export function detachFoundryColyseusRoom() {
  FoundryNet.attachRoom(null);
}
