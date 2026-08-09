import GameController from 'components/controllers/GameController';
import InputController from 'components/controllers/inputController';
import SceneController, { scene as citaadelScene } from 'components/controllers/SceneController';
import Players from 'components/phaser/Players';
import { toggleFollowGotchi } from 'helpers/phaser.helper';
import {
  joinPotionShopRoom,
  leavePotionShopRoom,
  seedPotionShopLayout,
  type JoinPotionShopOpts,
} from 'helpers/colyseus.potionShop';
import { serializePotionShopLayout, type PotionShopLayout } from 'helpers/potionShop.layout.helper';
import { MAP_ID_POTION_SHOP, MAP_ID_CITAADEL } from 'shared_code/constants/const.game';

export type PotionShopSceneCallbacks = {
  onLeaveDoor: () => void;
};

type PotionShopSceneApi = {
  setCallbacks: (callbacks: PotionShopSceneCallbacks) => void;
  setLayout: (layout: PotionShopLayout | null) => void;
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
let callbacksRef: PotionShopSceneCallbacks | null = null;

function getGame(): PhaserGame | null {
  const fromScene = citaadelScene?.game as unknown as PhaserGame | undefined;
  if (fromScene?.scene) return fromScene;
  if (typeof window !== 'undefined') {
    const w = window as unknown as { game?: PhaserGame };
    if (w.game?.scene) return w.game;
  }
  return null;
}

function getPotionShopScene(): PotionShopSceneApi | null {
  const game = getGame();
  if (!game) return null;
  try {
    const s = game.scene.getScene(MAP_ID_POTION_SHOP) as PotionShopSceneApi | undefined;
    return s || null;
  } catch {
    return null;
  }
}

export function isPotionShopMapActive(): boolean {
  return active || GameController.MAP === MAP_ID_POTION_SHOP;
}

export function setPotionShopSceneCallbacks(callbacks: PotionShopSceneCallbacks) {
  callbacksRef = callbacks;
  getPotionShopScene()?.setCallbacks(callbacks);
}

export function applyPotionShopSceneLayout(layout: PotionShopLayout | null) {
  getPotionShopScene()?.setLayout(layout);
}

export type EnterPotionShopMapOpts = JoinPotionShopOpts & {
  layout: PotionShopLayout;
  callbacks: PotionShopSceneCallbacks;
};

export async function enterPotionShopMap(opts: EnterPotionShopMapOpts): Promise<{ ok: boolean; error?: string }> {
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

  GameController.updateMapType(MAP_ID_POTION_SHOP);

  const room = await joinPotionShopRoom({
    potionShopId: opts.potionShopId,
    ownerAddress: opts.ownerAddress,
    cartridgeId: opts.cartridgeId,
  });
  if (!room) {
    await abortEnter();
    return { ok: false, error: 'Could not join potion shop (full or auth failed).' };
  }

  seedPotionShopLayout(serializePotionShopLayout(opts.layout));
  callbacksRef = opts.callbacks;

  const data = {
    layout: opts.layout,
    callbacks: opts.callbacks,
  };

  const { PotionShopScene } = await import('components/phaser/scenes/potionShopScene');

  if (!game.scene.getScene(MAP_ID_POTION_SHOP)) {
    game.scene.add(MAP_ID_POTION_SHOP, PotionShopScene, false);
  }

  try {
    game.scene.run(MAP_ID_POTION_SHOP, data);
  } catch (e) {
    console.warn('enterPotionShopMap: scene.run failed, retry add', e);
    game.scene.add(MAP_ID_POTION_SHOP, PotionShopScene, true, data);
  }

  active = true;
  return { ok: true };
}

export async function leavePotionShopMap(): Promise<void> {
  if (!active && GameController.MAP !== MAP_ID_POTION_SHOP) {
    await leavePotionShopRoom();
    return;
  }

  const game = getGame();
  try {
    game?.scene.stop(MAP_ID_POTION_SHOP);
  } catch {
    /* ignore */
  }

  await leavePotionShopRoom();
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
