import GameController from 'components/controllers/GameController';
import InputController from 'components/controllers/inputController';
import SceneController, { scene as citaadelScene } from 'components/controllers/SceneController';
import Players from 'components/phaser/Players';
import { toggleFollowGotchi } from 'helpers/phaser.helper';
import {
  joinDaoOfficeRoom,
  leaveDaoOfficeRoom,
  seedDaoOfficeLayout,
  type JoinDaoOfficeOpts,
} from 'helpers/colyseus.daoOffice';
import { serializeDaoOfficeLayout, type DaoOfficeLayout } from 'helpers/daoOffice.layout.helper';
import { MAP_ID_DAO_OFFICE, MAP_ID_CITAADEL } from 'shared_code/constants/const.game';

export type DaoOfficeSceneCallbacks = {
  onLeaveDoor: () => void;
};

type DaoOfficeSceneApi = {
  setCallbacks: (callbacks: DaoOfficeSceneCallbacks) => void;
  setLayout: (layout: DaoOfficeLayout | null) => void;
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
let callbacksRef: DaoOfficeSceneCallbacks | null = null;

function getGame(): PhaserGame | null {
  const fromScene = citaadelScene?.game as unknown as PhaserGame | undefined;
  if (fromScene?.scene) return fromScene;
  if (typeof window !== 'undefined') {
    const w = window as unknown as { game?: PhaserGame };
    if (w.game?.scene) return w.game;
  }
  return null;
}

function getDaoOfficeScene(): DaoOfficeSceneApi | null {
  const game = getGame();
  if (!game) return null;
  try {
    const s = game.scene.getScene(MAP_ID_DAO_OFFICE) as DaoOfficeSceneApi | undefined;
    return s || null;
  } catch {
    return null;
  }
}

export function isDaoOfficeMapActive(): boolean {
  return active || GameController.MAP === MAP_ID_DAO_OFFICE;
}

export function setDaoOfficeSceneCallbacks(callbacks: DaoOfficeSceneCallbacks) {
  callbacksRef = callbacks;
  getDaoOfficeScene()?.setCallbacks(callbacks);
}

export function applyDaoOfficeSceneLayout(layout: DaoOfficeLayout | null) {
  getDaoOfficeScene()?.setLayout(layout);
}

export type EnterDaoOfficeMapOpts = JoinDaoOfficeOpts & {
  layout: DaoOfficeLayout;
  callbacks: DaoOfficeSceneCallbacks;
};

export async function enterDaoOfficeMap(opts: EnterDaoOfficeMapOpts): Promise<{ ok: boolean; error?: string }> {
  if (active) return { ok: true };

  const game = getGame();
  if (!game) return { ok: false, error: 'Phaser game not ready' };

  const pid = Players.selectedPlayer?.id;
  if (pid && citaadelScene?.[pid]) {
    returnPos = { x: citaadelScene[pid].x, y: citaadelScene[pid].y };
  }
  citaadelKey = String(citaadelScene?.scene?.key || MAP_ID_CITAADEL);

  InputController.updateDisableKeyboard(true);
  toggleFollowGotchi(false);

  try {
    const Installations = (await import('components/phaser/Installations')).default;
    void Installations.setActiveInstallation?.();
  } catch {
    /* ignore */
  }

  try {
    game.scene.sleep(citaadelKey);
  } catch {
    try {
      game.scene.pause(citaadelKey);
    } catch {
      /* ignore */
    }
  }

  GameController.updateMapType(MAP_ID_DAO_OFFICE);

  const room = await joinDaoOfficeRoom({
    daoOfficeId: opts.daoOfficeId,
    ownerAddress: opts.ownerAddress,
    cartridgeId: opts.cartridgeId,
  });
  if (!room) {
    await abortEnter();
    return { ok: false, error: 'Could not join DAO office (full or auth failed).' };
  }

  seedDaoOfficeLayout(serializeDaoOfficeLayout(opts.layout));
  callbacksRef = opts.callbacks;

  const data = {
    layout: opts.layout,
    callbacks: opts.callbacks,
  };

  const { DaoOfficeScene } = await import('components/phaser/scenes/daoOfficeScene');

  if (!game.scene.getScene(MAP_ID_DAO_OFFICE)) {
    game.scene.add(MAP_ID_DAO_OFFICE, DaoOfficeScene, false);
  }

  try {
    game.scene.run(MAP_ID_DAO_OFFICE, data);
  } catch (e) {
    console.warn('enterDaoOfficeMap: scene.run failed, retry add', e);
    game.scene.add(MAP_ID_DAO_OFFICE, DaoOfficeScene, true, data);
  }

  active = true;
  return { ok: true };
}

export async function leaveDaoOfficeMap(): Promise<void> {
  if (!active && GameController.MAP !== MAP_ID_DAO_OFFICE) {
    await leaveDaoOfficeRoom();
    return;
  }

  const game = getGame();
  try {
    game?.scene.stop(MAP_ID_DAO_OFFICE);
  } catch {
    /* ignore */
  }

  await leaveDaoOfficeRoom();
  GameController.updateMapType(MAP_ID_CITAADEL);

  try {
    if (game?.scene.isSleeping?.(citaadelKey)) game.scene.wake(citaadelKey);
    else game?.scene.resume(citaadelKey);
  } catch {
    /* ignore */
  }

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
