import GameController from 'components/controllers/GameController';
import InputController from 'components/controllers/inputController';
import SceneController, { scene as citaadelScene } from 'components/controllers/SceneController';
import Players from 'components/phaser/Players';
import { toggleFollowGotchi } from 'helpers/phaser.helper';
import {
  joinStoreRoom,
  leaveStoreRoom,
  seedStoreLayout,
  type JoinStoreOpts,
} from 'helpers/colyseus.store';
import { serializeLayout, type StoreFurniturePiece, type StoreLayout } from 'helpers/store.layout.helper';
import { MAP_ID_CITAADEL, MAP_ID_STORE } from 'shared_code/constants/const.game';

/** Kept here (not in storeScene) so HUD can import without pulling Phaser into SSR. */
export type StoreSceneBuildState = {
  buildMode: boolean;
  placeBrush: number | null;
  floorBrush: number | null;
  /** Furniture ghost pinned here until Confirm (null = follow cursor). */
  pendingPlace?: { tx: number; ty: number } | null;
};

export type StoreSceneCallbacks = {
  onInteractShelf: (piece: StoreFurniturePiece) => void;
  onInteractCashier: (piece: StoreFurniturePiece) => void;
  onInteractConsole: (piece: StoreFurniturePiece) => void;
  onInteractTerminal: (piece: StoreFurniturePiece) => void;
  onBuildTileClick: (tx: number, ty: number) => void;
  onLeaveDoor: () => void;
  onSelectFurniture: (piece: StoreFurniturePiece | null) => void;
  /** Store build-mode chrome — mirror parcel UPGRADE / MOVE / REMOVE. */
  onUpgradeFurniture?: (piece: StoreFurniturePiece) => void;
  onMoveFurniture?: (piece: StoreFurniturePiece) => void;
  onRemoveFurniture?: (piece: StoreFurniturePiece) => void;
};

type StoreSceneApi = {
  setCallbacks: (callbacks: StoreSceneCallbacks) => void;
  setLayout: (layout: StoreLayout | null) => void;
  setBuildState: (build: StoreSceneBuildState) => void;
  nudgeBuildCamera?: (dir: -1 | 1) => void;
};

type PhaserGame = {
  scene: {
    getScene: (key: string) => unknown;
    add: (key: string, scene: unknown, autoStart?: boolean, data?: unknown) => void;
    run: (key: string, data?: unknown) => void;
    pause: (key?: string) => void;
    resume: (key?: string) => void;
    sleep: (key?: string) => void;
    wake: (key?: string) => void;
    stop: (key?: string) => void;
    isActive: (key: string) => boolean;
    isPaused: (key: string) => boolean;
    isSleeping: (key: string) => boolean;
  };
};

let active = false;
let citaadelKey = MAP_ID_CITAADEL;
let returnPos: { x: number; y: number } | null = null;
let callbacksRef: StoreSceneCallbacks | null = null;

function getGame(): PhaserGame | null {
  const fromScene = citaadelScene?.game as unknown as PhaserGame | undefined;
  if (fromScene?.scene) return fromScene;
  if (typeof window !== 'undefined') {
    const w = window as unknown as { game?: PhaserGame };
    if (w.game?.scene) return w.game;
  }
  return null;
}

function getStoreScene(): StoreSceneApi | null {
  const game = getGame();
  if (!game) return null;
  try {
    const s = game.scene.getScene(MAP_ID_STORE) as StoreSceneApi | undefined;
    return s || null;
  } catch {
    return null;
  }
}

export function isStoreMapActive(): boolean {
  return active || GameController.MAP === MAP_ID_STORE;
}

export function setStoreSceneCallbacks(callbacks: StoreSceneCallbacks) {
  callbacksRef = callbacks;
  getStoreScene()?.setCallbacks(callbacks);
}

export function applyStoreSceneLayout(layout: StoreLayout | null) {
  getStoreScene()?.setLayout(layout);
}

export function setStoreSceneBuildState(build: StoreSceneBuildState) {
  getStoreScene()?.setBuildState(build);
}

/** Pan store camera left (-1) / right (1) while build inventory covers the right side. */
export function nudgeStoreBuildCamera(dir: -1 | 1) {
  getStoreScene()?.nudgeBuildCamera?.(dir);
}

export type EnterStoreMapOpts = JoinStoreOpts & {
  layout: StoreLayout;
  callbacks: StoreSceneCallbacks;
};

export async function enterStoreMap(opts: EnterStoreMapOpts): Promise<{ ok: boolean; error?: string }> {
  if (active) return { ok: true };

  const game = getGame();
  if (!game) return { ok: false, error: 'Phaser game not ready' };

  // Remember citaadel pose for exit restore.
  const pid = Players.selectedPlayer?.id;
  if (pid && citaadelScene?.[pid]) {
    returnPos = { x: citaadelScene[pid].x, y: citaadelScene[pid].y };
  }
  citaadelKey = String(citaadelScene?.scene?.key || MAP_ID_CITAADEL);

  InputController.updateDisableKeyboard(true);
  toggleFollowGotchi(false);

  // Clear parcel selection chrome so UPGRADE/MOVE/REMOVE can't flash over the store.
  try {
    const Installations = (await import('components/phaser/Installations')).default;
    void Installations.setActiveInstallation?.();
  } catch {
    /* ignore */
  }

  // Prefer sleep so citaadel nameplates / HP bars stop rendering (pause still paints).
  try {
    game.scene.sleep(citaadelKey);
  } catch {
    try {
      game.scene.pause(citaadelKey);
    } catch {
      /* ignore */
    }
  }

  GameController.updateMapType(MAP_ID_STORE);

  const room = await joinStoreRoom({
    storeId: opts.storeId,
    ownerAddress: opts.ownerAddress,
    cartridgeId: opts.cartridgeId,
  });
  if (!room) {
    await abortEnter();
    return { ok: false, error: 'Could not join store (full or auth failed).' };
  }

  seedStoreLayout(serializeLayout(opts.layout));
  callbacksRef = opts.callbacks;

  const data = {
    layout: opts.layout,
    callbacks: opts.callbacks,
    build: { buildMode: false, placeBrush: null, floorBrush: null, pendingPlace: null } as StoreSceneBuildState,
  };

  // Dynamic import — StoreScene extends Phaser and must never load during Next SSR.
  const { StoreScene } = await import('components/phaser/scenes/storeScene');

  if (!game.scene.getScene(MAP_ID_STORE)) {
    game.scene.add(MAP_ID_STORE, StoreScene, false);
  }

  try {
    game.scene.run(MAP_ID_STORE, data);
  } catch (e) {
    console.warn('enterStoreMap: scene.run failed, retry add', e);
    game.scene.add(MAP_ID_STORE, StoreScene, true, data);
  }

  active = true;
  return { ok: true };
}

export async function leaveStoreMap(): Promise<void> {
  if (!active && GameController.MAP !== MAP_ID_STORE) {
    await leaveStoreRoom();
    return;
  }

  const game = getGame();
  try {
    game?.scene.stop(MAP_ID_STORE);
  } catch {
    /* ignore */
  }

  await leaveStoreRoom();
  GameController.updateMapType(MAP_ID_CITAADEL);

  try {
    if (game?.scene.isSleeping?.(citaadelKey)) game.scene.wake(citaadelKey);
    else game?.scene.resume(citaadelKey);
  } catch {
    /* ignore */
  }

  // Restore SceneController pointer to citaadel (store never overwrote it, but wake may need follow).
  if (citaadelScene) {
    SceneController.setScene(citaadelScene);
    const pid = Players.selectedPlayer?.id;
    if (pid && citaadelScene[pid] && returnPos) {
      citaadelScene[pid].x = returnPos.x;
      citaadelScene[pid].y = returnPos.y;
      try {
        citaadelScene.cameras?.main?.startFollow?.(citaadelScene[pid], true, 0.08, 0.08);
      } catch {
        /* ignore */
      }
    }
  }

  InputController.updateDisableKeyboard(false);
  toggleFollowGotchi(true);
  // Sleep/wake can leave the local sprite hidden — force reveal selected player.
  try {
    const pid = Players.selectedPlayer?.id;
    if (pid) {
      Players.toggleVisible(pid, true);
      // Delayed pass in case wake restores a stale hidden child flag.
      window.setTimeout(() => {
        try {
          Players.toggleVisible(pid, true);
        } catch {
          /* ignore */
        }
      }, 200);
    }
  } catch {
    /* ignore */
  }
  active = false;
  returnPos = null;
  callbacksRef = null;
}

async function abortEnter() {
  const game = getGame();
  GameController.updateMapType(MAP_ID_CITAADEL);
  try {
    if (game?.scene.isSleeping?.(citaadelKey)) game.scene.wake(citaadelKey);
    else game?.scene.resume(citaadelKey);
  } catch {
    /* ignore */
  }
  InputController.updateDisableKeyboard(false);
  toggleFollowGotchi(true);
  active = false;
}
