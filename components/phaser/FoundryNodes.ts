/* eslint-disable @typescript-eslint/no-var-requires */
import { scene } from 'components/controllers/SceneController';
import GlobalState from 'contexts/GlobalState';
import { FOUNDRY_DEFAULTS } from 'helpers/foundry/config';
import { FoundryNet, FoundryStore } from 'helpers/foundry';
import { AntennaEntity, FoundryState } from 'helpers/foundry/types';
import Phaser from 'phaser';

type ContainerMap = Map<string, Phaser.GameObjects.Container>;

const nodes: ContainerMap = new Map();
const antennas: ContainerMap = new Map();
const receivers: ContainerMap = new Map();
const linkGraphics: Phaser.GameObjects.Graphics[] = [];

let unsub: (() => void) | null = null;
let loaded = false;
let placeMode = false;

const TEXTURE_URLS: Record<string, string> = {
  foundry_yield_node: '/animations/spritesheets/foundry/foundry_yield_node.png',
  foundry_desert_node: '/animations/spritesheets/foundry/foundry_desert_node.png',
  foundry_antenna: '/animations/spritesheets/foundry/foundry_antenna.png',
  foundry_receiver: '/animations/spritesheets/foundry/foundry_receiver.png',
  foundry_linkbreaker: '/animations/spritesheets/foundry/foundry_linkbreaker.png',
};

function ensureTextures(): Promise<void> {
  if (!scene || loaded) return Promise.resolve();
  return new Promise((resolve) => {
    let pending = 0;
    Object.entries(TEXTURE_URLS).forEach(([key, url]) => {
      if (scene.textures.exists(key)) return;
      pending += 1;
      scene.load.spritesheet(key, url, { frameWidth: 64, frameHeight: 64 });
    });
    if (!pending) {
      loaded = true;
      resolve();
      return;
    }
    scene.load.once('complete', () => {
      loaded = true;
      resolve();
    });
    scene.load.start();
  });
}

function clearLinks() {
  while (linkGraphics.length) {
    const g = linkGraphics.pop();
    g?.destroy();
  }
}

function drawLinks(state: FoundryState) {
  clearLinks();
  if (!scene || !state.enabled) return;
  const g = scene.add.graphics().setDepth(50);
  const color = state.netherlink === 'green' ? 0x50dce6 : state.netherlink === 'amber' ? 0xf08c32 : 0xdc4650;
  g.lineStyle(3, color, 0.7);

  const pts = [
    ...state.antennas.filter((a) => a.powered && a.hp > 0).map((a) => ({ x: a.x, y: a.y })),
    ...state.wallReceivers.map((r) => ({ x: r.x, y: r.y })),
  ];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Phaser.Math.Distance.Between(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
      if (d <= state.antennaLinkRangePx) {
        g.lineBetween(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
      }
    }
  }
  linkGraphics.push(g);
}

function antennaFrame(a: AntennaEntity): number {
  if (!a.powered || a.hp <= 0) return 3;
  if (a.hp < 50) return 2;
  return 1;
}

function syncFromState(state: FoundryState) {
  if (!scene || !state.enabled) {
    destroyAll();
    return;
  }

  state.wildNodes.forEach((n) => {
    let c = nodes.get(n.id);
    if (!c) {
      c = scene.add.container(n.x, n.y).setDepth(120);
      const key = n.veinType === 'yield' ? 'foundry_yield_node' : 'foundry_desert_node';
      const spr = scene.add.sprite(0, 0, key, 0).setInteractive({ useHandCursor: true });
      spr.on('pointerdown', () => {
        const res = FoundryNet.gather(n.id);
        console.log('@FoundryNodes.gather', res);
      });
      c.add(spr);
      nodes.set(n.id, c);
    } else {
      c.setPosition(n.x, n.y);
    }
  });

  state.wallReceivers.forEach((r) => {
    let c = receivers.get(r.id);
    if (!c) {
      c = scene.add.container(r.x, r.y).setDepth(120);
      const spr = scene.add.sprite(0, 0, 'foundry_receiver', 0).setInteractive({ useHandCursor: true });
      spr.on('pointerdown', () => {
        const res = FoundryNet.deposit();
        console.log('@FoundryNodes.deposit', res);
      });
      c.add(spr);
      receivers.set(r.id, c);
    } else {
      c.setPosition(r.x, r.y);
    }
  });

  const liveIds = new Set(state.antennas.map((a) => a.id));
  antennas.forEach((c, id) => {
    if (!liveIds.has(id)) {
      c.destroy();
      antennas.delete(id);
    }
  });

  state.antennas.forEach((a) => {
    let c = antennas.get(a.id);
    if (!c) {
      c = scene.add.container(a.x, a.y).setDepth(121);
      const spr = scene.add.sprite(0, 0, 'foundry_antenna', antennaFrame(a));
      c.add(spr);
      antennas.set(a.id, c);
    } else {
      c.setPosition(a.x, a.y);
      const spr = c.list[0] as Phaser.GameObjects.Sprite;
      spr?.setFrame(antennaFrame(a));
    }
  });

  drawLinks(state);
}

async function init(): Promise<void> {
  const cfg = GlobalState.GAME.state?.gameConfig as { enableParcelFoundryPoC?: boolean } | undefined;
  const enabled = Boolean(cfg?.enableParcelFoundryPoC) || process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC === 'true';
  if (!enabled) return;

  await FoundryNet.init(process.env.NEXT_PUBLIC_API_URL);
  FoundryStore.setFoundryEnabled(true);
  await ensureTextures();

  if (unsub) unsub();
  unsub = FoundryStore.subscribe((s) => syncFromState(s));
  syncFromState(FoundryStore.getState());

  // Click-to-place antennas when placeMode is on (toggled from FoundryPanel)
  scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (!placeMode) return;
    if (pointer.rightButtonDown()) return;
    const world = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const res = FoundryNet.placeAntenna(Math.round(world.x), Math.round(world.y));
    console.log('@FoundryNodes.placeAntenna', res);
  });
}

function setPlaceMode(on: boolean) {
  placeMode = on;
}

function tryInteractNearby(): string {
  const selected = GlobalState.REALM.state?.selectedPlayer;
  if (!selected?.id || !scene) return 'No player';
  const container = scene[selected.id] as Phaser.GameObjects.Container | undefined;
  if (!container) return 'No player container';
  const state = FoundryStore.getState();
  const px = container.x;
  const py = container.y;
  const r = FOUNDRY_DEFAULTS.interactRadiusPx;

  for (const n of state.wildNodes) {
    if (Phaser.Math.Distance.Between(px, py, n.x, n.y) <= r) {
      return FoundryNet.gather(n.id).message;
    }
  }
  for (const recv of state.wallReceivers) {
    if (Phaser.Math.Distance.Between(px, py, recv.x, recv.y) <= r) {
      return FoundryNet.deposit().message;
    }
  }
  return 'Nothing nearby';
}

function destroyAll() {
  clearLinks();
  nodes.forEach((c) => c.destroy());
  antennas.forEach((c) => c.destroy());
  receivers.forEach((c) => c.destroy());
  nodes.clear();
  antennas.clear();
  receivers.clear();
}

const FoundryNodes = {
  init,
  destroyAll,
  setPlaceMode,
  tryInteractNearby,
};

export default FoundryNodes;
