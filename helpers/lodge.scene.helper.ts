import GameController from 'components/controllers/GameController';
import InputController from 'components/controllers/inputController';
import SceneController, { scene as citaadelScene } from 'components/controllers/SceneController';
import Players from 'components/phaser/Players';
import { toggleFollowGotchi } from 'helpers/phaser.helper';
import {
  joinLodgeRoom,
  leaveLodgeRoom,
  seedLodgeLayout,
  type JoinLodgeOpts,
} from 'helpers/colyseus.lodge';
import { serializeLodgeLayout, type LodgeFurniturePiece, type LodgeLayout } from 'helpers/lodge.layout.helper';
import { MAP_ID_CITAADEL, MAP_ID_LODGE } from 'shared_code/constants/const.game';

/** Kept here (not in storeScene) so HUD can import without pulling Phaser into SSR. */
export type LodgeSceneBuildState = {
  buildMode: boolean;
  placeBrush: number | null;
  floorBrush: number | null;
  /** Furniture ghost pinned here until Confirm (null = follow cursor). */
  pendingPlace?: { tx: number; ty: number } | null;
};

export type LodgeSceneCallbacks = {
  onInteractShelf: (piece: LodgeFurniturePiece) => void;
  onInteractCashier: (piece: LodgeFurniturePiece) => void;
  onInteractConsole: (piece: LodgeFurniturePiece) => void;
  onInteractTerminal: (piece: LodgeFurniturePiece) => void;
  onInteractBroadcaster: (piece: LodgeFurniturePiece) => void;
  onBuildTileClick: (tx: number, ty: number) => void;
  onLeaveDoor: () => void;
  onSelectFurniture: (piece: LodgeFurniturePiece | null) => void;
  /** Store build-mode chrome — mirror parcel UPGRADE / MOVE / REMOVE. */
  onUpgradeFurniture?: (piece: LodgeFurniturePiece) => void;
  onMoveFurniture?: (piece: LodgeFurniturePiece) => void;
  onRemoveFurniture?: (piece: LodgeFurniturePiece) => void;
};

type LodgeSceneApi = {
  setCallbacks: (callbacks: LodgeSceneCallbacks) => void;
  setLayout: (layout: LodgeLayout | null) => void;
  setBuildState: (build: LodgeSceneBuildState) => void;
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
let callbacksRef: LodgeSceneCallbacks | null = null;

function getGame(): PhaserGame | null {
  const fromScene = citaadelScene?.game as unknown as PhaserGame | undefined;
  if (fromScene?.scene) return fromScene;
  if (typeof window !== 'undefined') {
    const w = window as unknown as { game?: PhaserGame };
    if (w.game?.scene) return w.game;
  }
  return null;
}

function getLodgeScene(): LodgeSceneApi | null {
  const game = getGame();
  if (!game) return null;
  try {
    const s = game.scene.getScene(MAP_ID_LODGE) as LodgeSceneApi | undefined;
    return s || null;
  } catch {
    return null;
  }
}

export function isLodgeMapActive(): boolean {
  return active || GameController.MAP === MAP_ID_LODGE;
}

export function setLodgeSceneCallbacks(callbacks: LodgeSceneCallbacks) {
  callbacksRef = callbacks;
  getLodgeScene()?.setCallbacks(callbacks);
}

export function applyLodgeSceneLayout(layout: LodgeLayout | null) {
  getLodgeScene()?.setLayout(layout);
}

export function setLodgeSceneBuildState(build: LodgeSceneBuildState) {
  getLodgeScene()?.setBuildState(build);
}

/** Pan lodge camera left (-1) / right (1) while build inventory covers the right side. */
export function nudgeLodgeBuildCamera(dir: -1 | 1) {
  getLodgeScene()?.nudgeBuildCamera?.(dir);
}

export type EnterLodgeMapOpts = JoinLodgeOpts & {
  layout: LodgeLayout;
  callbacks: LodgeSceneCallbacks;
};

export async function enterLodgeMap(opts: EnterLodgeMapOpts): Promise<{ ok: boolean; error?: string }> {
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

  GameController.updateMapType(MAP_ID_LODGE);

  const room = await joinLodgeRoom({
    lodgeId: opts.lodgeId,
    ownerAddress: opts.ownerAddress,
    cartridgeId: opts.cartridgeId,
  });
  if (!room) {
    await abortEnter();
    return { ok: false, error: 'Could not join lodge (full or auth failed).' };
  }

  seedLodgeLayout(serializeLodgeLayout(opts.layout));
  callbacksRef = opts.callbacks;

  const data = {
    layout: opts.layout,
    callbacks: opts.callbacks,
    build: { buildMode: false, placeBrush: null, floorBrush: null, pendingPlace: null } as LodgeSceneBuildState,
  };

  // Dynamic import — LodgeScene extends Phaser and must never load during Next SSR.
  const { LodgeScene } = await import('components/phaser/scenes/lodgeScene');

  if (!game.scene.getScene(MAP_ID_LODGE)) {
    game.scene.add(MAP_ID_LODGE, LodgeScene, false);
  }

  try {
    game.scene.run(MAP_ID_LODGE, data);
  } catch (e) {
    console.warn('enterLodgeMap: scene.run failed, retry add', e);
    game.scene.add(MAP_ID_LODGE, LodgeScene, true, data);
  }

  active = true;
  return { ok: true };
}

export async function leaveLodgeMap(): Promise<void> {
  if (!active && GameController.MAP !== MAP_ID_LODGE) {
    await leaveLodgeRoom();
    return;
  }

  const game = getGame();
  try {
    game?.scene.stop(MAP_ID_LODGE);
  } catch {
    /* ignore */
  }

  await leaveLodgeRoom();
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
