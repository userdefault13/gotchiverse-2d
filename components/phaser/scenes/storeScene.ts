/**
 * MAP_ID_STORE — the entire map is a 16×16 store interior (1024×1024).
 */
import GlobalState from 'contexts/GlobalState';
import {
  STORE_GRID,
  STORE_SPAWN_TX,
  STORE_SPAWN_TY,
  floorCellUrl,
  floorKey,
  furnitureAt,
  isCashierItemId,
  isConsoleItemId,
  isShelfItemId,
  storeIsWalkable,
  storeStructureAt,
  storeTileCenter,
  type StoreFurniturePiece,
  type StoreLayout,
} from 'helpers/store.layout.helper';
import { sendStoreMove, getStoreRoom } from 'helpers/colyseus.store';
import { MAP_CONFIG_BY_ID, MAP_ID_STORE, TILE_SIZE } from 'shared_code/constants/const.game';

export type StoreSceneBuildState = {
  buildMode: boolean;
  placeBrush: number | null;
  floorBrush: number | null;
};

export type StoreSceneCallbacks = {
  onInteractShelf: (piece: StoreFurniturePiece) => void;
  onInteractCashier: (piece: StoreFurniturePiece) => void;
  onInteractConsole: (piece: StoreFurniturePiece) => void;
  onBuildTileClick: (tx: number, ty: number) => void;
  onLeaveDoor: () => void;
  onSelectFurniture: (piece: StoreFurniturePiece | null) => void;
};

type RemoteSprite = {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
};

const WALL_COLOR = 0x5c4033;
const WINDOW_COLOR = 0x88ccee;
const DOOR_COLOR = 0xa8d4ff;
const FLOOR_FALLBACK = 0x3a3a48;
const PLAYER_SPEED = 220;

export class StoreScene extends Phaser.Scene {
  private layout: StoreLayout | null = null;
  private callbacks: StoreSceneCallbacks | null = null;
  private build: StoreSceneBuildState = { buildMode: false, placeBrush: null, floorBrush: null };

  private tileLayer: Phaser.GameObjects.Container | null = null;
  private furnitureLayer: Phaser.GameObjects.Container | null = null;
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private interactKey!: Phaser.Input.Keyboard.Key;
  private lastMoveSent = 0;
  private facing = 0;
  private blocked = new Set<string>();
  private remotes = new Map<string, RemoteSprite>();
  private doorCooldownUntil = 0;
  private gotchiTextureKey = '';

  constructor() {
    super({ key: MAP_ID_STORE });
  }

  init(data: {
    layout?: StoreLayout | null;
    callbacks?: StoreSceneCallbacks;
    build?: StoreSceneBuildState;
  }) {
    this.layout = data?.layout || null;
    this.callbacks = data?.callbacks || null;
    if (data?.build) this.build = { ...data.build };
    this.doorCooldownUntil = this.time.now + 800;
  }

  preload() {
    const gotchiId = String(GlobalState.REALM?.state?.selectedPlayer?.id || '');
    const spriteUrl = GlobalState.REALM?.state?.gotchiUrl?.sprite || '';
    // Prefer the spritesheet already loaded on citaadel (texture key = gotchi id).
    if (gotchiId && this.textures.exists(gotchiId)) {
      this.gotchiTextureKey = gotchiId;
    } else {
      this.gotchiTextureKey = gotchiId ? `store_gotchi_${gotchiId}` : 'store_gotchi_local';
      if (spriteUrl && !this.textures.exists(this.gotchiTextureKey)) {
        this.load.spritesheet(this.gotchiTextureKey, spriteUrl, { frameWidth: 64, frameHeight: 64 });
      }
    }

    // Furniture sheets may already be on the citaadel scene textures — copy via load if missing.
    if (!this.textures.exists('shelf')) {
      this.load.spritesheet('shelf', '/animations/installations/shelf.png', { frameWidth: 256, frameHeight: 256 });
    }
    if (!this.textures.exists('cashier')) {
      this.load.spritesheet('cashier', '/animations/installations/cashier.png', { frameWidth: 256, frameHeight: 256 });
    }
    if (!this.textures.exists('console')) {
      this.load.spritesheet('console', '/animations/installations/console.png', { frameWidth: 256, frameHeight: 256 });
    }

    // Floor tiles used by current layout
    const floor = this.layout?.floor || {};
    const needed = new Set<string>();
    Object.values(floor).forEach((cell) => {
      const url = floorCellUrl(cell);
      if (url) needed.add(url);
    });
    // Common greyscale pack for empty floors
    for (let i = 8; i <= 20; i += 1) {
      needed.add(`/images/tiles/greyscale/Tile_LE_${i}_base.png`);
    }
    needed.forEach((url) => {
      const key = floorTexKey(url);
      if (!this.textures.exists(key)) this.load.image(key, url);
    });
  }

  create() {
    const cfg = MAP_CONFIG_BY_ID[MAP_ID_STORE];
    this.cameras.main.setBackgroundColor('#150628');
    this.cameras.main.setBounds(0, 0, cfg.WIDTH, cfg.HEIGHT);

    this.tileLayer = this.add.container(0, 0).setDepth(0);
    this.furnitureLayer = this.add.container(0, 0).setDepth(10);
    this.rebuildWorld();

    const spawn = storeTileCenter(STORE_SPAWN_TX, STORE_SPAWN_TY);
    this.player = this.add.container(spawn.x, spawn.y).setDepth(50);
    if (this.textures.exists(this.gotchiTextureKey)) {
      this.playerSprite = this.add.sprite(0, 0, this.gotchiTextureKey, 0);
      this.playerSprite.setDisplaySize(64, 64);
    } else {
      this.playerSprite = this.add.rectangle(0, 0, 40, 40, 0x51ffa8);
    }
    this.player.add(this.playerSprite);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(Math.min(2.2, Math.max(1.1, 720 / cfg.WIDTH)));

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D') as StoreScene['wasd'];
      this.interactKey = this.input.keyboard.addKey('E');
      this.input.keyboard.addKey('ENTER').on('down', () => this.tryInteract());
      this.interactKey.on('down', () => this.tryInteract());
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      const wx = this.cameras.main.getWorldPoint(pointer.x, pointer.y).x;
      const wy = this.cameras.main.getWorldPoint(pointer.x, pointer.y).y;
      const tx = Math.floor(wx / TILE_SIZE);
      const ty = Math.floor(wy / TILE_SIZE);
      if (this.build.buildMode) {
        this.callbacks?.onBuildTileClick(tx, ty);
        return;
      }
      const piece = this.layout ? furnitureAt(this.layout, tx, ty) : null;
      this.callbacks?.onSelectFurniture(piece || null);
      if (piece && isShelfItemId(piece.itemId)) this.callbacks?.onInteractShelf(piece);
      if (piece && isCashierItemId(piece.itemId)) this.callbacks?.onInteractCashier(piece);
      if (piece && isConsoleItemId(piece.itemId)) this.callbacks?.onInteractConsole(piece);
    });

    sendStoreMove(spawn.x, spawn.y);
  }

  update(_t: number, dt: number) {
    if (!this.player) return;
    this.syncRemotes();

    let vx = 0;
    let vy = 0;
    if (this.cursors?.left?.isDown || this.wasd?.A?.isDown) vx -= 1;
    if (this.cursors?.right?.isDown || this.wasd?.D?.isDown) vx += 1;
    if (this.cursors?.up?.isDown || this.wasd?.W?.isDown) vy -= 1;
    if (this.cursors?.down?.isDown || this.wasd?.S?.isDown) vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy) || 1;
      vx /= len;
      vy /= len;
      const speed = PLAYER_SPEED * (dt / 1000);
      const nextX = this.player.x + vx * speed;
      const nextY = this.player.y + vy * speed;
      const resolved = this.resolveMove(this.player.x, this.player.y, nextX, nextY);
      this.player.setPosition(resolved.x, resolved.y);
      this.setFacing(vx, vy);
      const now = Date.now();
      if (now - this.lastMoveSent > 40) {
        this.lastMoveSent = now;
        sendStoreMove(Math.round(resolved.x), Math.round(resolved.y));
      }
    }

    // Leave via door after brief spawn grace
    if (this.time.now > this.doorCooldownUntil) {
      const tx = Math.floor(this.player.x / TILE_SIZE);
      const ty = Math.floor(this.player.y / TILE_SIZE);
      if (storeStructureAt(tx, ty) === 'door' && vy > 0) {
        this.callbacks?.onLeaveDoor();
      }
    }
  }

  setLayout(layout: StoreLayout | null) {
    this.layout = layout;
    if (this.tileLayer) this.rebuildWorld();
  }

  setBuildState(build: StoreSceneBuildState) {
    this.build = { ...build };
  }

  setCallbacks(callbacks: StoreSceneCallbacks) {
    this.callbacks = callbacks;
  }

  getPlayerTile(): { tx: number; ty: number } {
    return {
      tx: Math.floor((this.player?.x || 0) / TILE_SIZE),
      ty: Math.floor((this.player?.y || 0) / TILE_SIZE),
    };
  }

  private rebuildWorld() {
    this.tileLayer?.removeAll(true);
    this.furnitureLayer?.removeAll(true);
    this.blocked.clear();

    for (let ty = 0; ty < STORE_GRID; ty += 1) {
      for (let tx = 0; tx < STORE_GRID; tx += 1) {
        const kind = storeStructureAt(tx, ty);
        const cx = tx * TILE_SIZE + TILE_SIZE / 2;
        const cy = ty * TILE_SIZE + TILE_SIZE / 2;
        if (kind === 'wall') {
          const wall = this.add.rectangle(cx, cy, TILE_SIZE - 2, TILE_SIZE - 2, WALL_COLOR);
          this.tileLayer?.add(wall);
          this.blocked.add(`${tx},${ty}`);
        } else if (kind === 'window') {
          const win = this.add.rectangle(cx, cy, TILE_SIZE - 2, TILE_SIZE - 2, WINDOW_COLOR, 0.85);
          this.tileLayer?.add(win);
          this.blocked.add(`${tx},${ty}`);
        } else if (kind === 'door') {
          const door = this.add.rectangle(cx, cy, TILE_SIZE - 2, TILE_SIZE - 2, DOOR_COLOR, 0.7);
          this.tileLayer?.add(door);
        } else {
          const cell = this.layout?.floor?.[floorKey(tx, ty)];
          const url = floorCellUrl(cell);
          const key = url ? floorTexKey(url) : '';
          if (key && this.textures.exists(key)) {
            const img = this.add.image(cx, cy, key).setDisplaySize(TILE_SIZE, TILE_SIZE);
            this.tileLayer?.add(img);
          } else {
            const floor = this.add.rectangle(cx, cy, TILE_SIZE - 1, TILE_SIZE - 1, FLOOR_FALLBACK);
            this.tileLayer?.add(floor);
          }
        }
      }
    }

    (this.layout?.furniture || []).forEach((piece) => {
      const cx = piece.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = piece.y * TILE_SIZE + TILE_SIZE / 2;
      let key = 'shelf';
      if (isCashierItemId(piece.itemId)) key = 'cashier';
      if (isConsoleItemId(piece.itemId)) key = 'console';
      let spr: Phaser.GameObjects.GameObject;
      if (this.textures.exists(key)) {
        const s = this.add.sprite(cx, cy, key, 0).setDisplaySize(TILE_SIZE * 0.95, TILE_SIZE * 0.95);
        spr = s;
      } else {
        const color = isShelfItemId(piece.itemId) ? 0xc4a574 : isCashierItemId(piece.itemId) ? 0x6bcb77 : 0x4d96ff;
        spr = this.add.rectangle(cx, cy, TILE_SIZE * 0.8, TILE_SIZE * 0.8, color);
      }
      this.furnitureLayer?.add(spr);
      this.blocked.add(`${piece.x},${piece.y}`);
    });
  }

  private resolveMove(fromX: number, fromY: number, toX: number, toY: number): { x: number; y: number } {
    const pad = 18;
    const tryPos = (x: number, y: number) => {
      const points = [
        { x: x - pad, y: y - pad },
        { x: x + pad, y: y - pad },
        { x: x - pad, y: y + pad },
        { x: x + pad, y: y + pad },
      ];
      return points.every((p) => {
        const tx = Math.floor(p.x / TILE_SIZE);
        const ty = Math.floor(p.y / TILE_SIZE);
        if (!storeIsWalkable(tx, ty)) return false;
        // Furniture blocks center but allow door/floor
        if (this.blocked.has(`${tx},${ty}`) && storeStructureAt(tx, ty) === 'floor') return false;
        return true;
      });
    };

    if (tryPos(toX, toY)) return { x: toX, y: toY };
    if (tryPos(toX, fromY)) return { x: toX, y: fromY };
    if (tryPos(fromX, toY)) return { x: fromX, y: toY };
    return { x: fromX, y: fromY };
  }

  private setFacing(vx: number, vy: number) {
    if (!(this.playerSprite instanceof Phaser.GameObjects.Sprite)) return;
    let frame = this.facing;
    if (Math.abs(vx) > Math.abs(vy)) frame = vx > 0 ? 2 : 1;
    else if (vy !== 0) frame = vy > 0 ? 0 : 3;
    if (frame !== this.facing) {
      this.facing = frame;
      this.playerSprite.setFrame(frame);
    }
  }

  private tryInteract() {
    const { tx, ty } = this.getPlayerTile();
    const under = this.layout ? furnitureAt(this.layout, tx, ty) : null;
    // Also check adjacent tiles (furniture is blocked so player stands beside)
    const neighbors = [
      under,
      this.layout ? furnitureAt(this.layout, tx, ty - 1) : null,
      this.layout ? furnitureAt(this.layout, tx, ty + 1) : null,
      this.layout ? furnitureAt(this.layout, tx - 1, ty) : null,
      this.layout ? furnitureAt(this.layout, tx + 1, ty) : null,
    ].filter(Boolean) as StoreFurniturePiece[];
    const piece = neighbors[0];
    if (!piece) return;
    if (isShelfItemId(piece.itemId)) this.callbacks?.onInteractShelf(piece);
    else if (isCashierItemId(piece.itemId)) this.callbacks?.onInteractCashier(piece);
    else if (isConsoleItemId(piece.itemId)) this.callbacks?.onInteractConsole(piece);
  }

  private syncRemotes() {
    const room = getStoreRoom();
    if (!room?.state?.players) return;
    const seen = new Set<string>();
    room.state.players.forEach((p, sessionId) => {
      if (sessionId === room.sessionId) return;
      seen.add(sessionId);
      let remote = this.remotes.get(sessionId);
      if (!remote) {
        const container = this.add.container(p.x || 0, p.y || 0).setDepth(40);
        const sprite = this.add.rectangle(0, 0, 36, 36, 0x7ec8ff, 0.9);
        container.add(sprite);
        remote = { container, sprite };
        this.remotes.set(sessionId, remote);
      }
      remote.container.setPosition(p.x || 0, p.y || 0);
    });
    this.remotes.forEach((remote, id) => {
      if (!seen.has(id)) {
        remote.container.destroy(true);
        this.remotes.delete(id);
      }
    });
  }
}

function floorTexKey(url: string): string {
  return `store_floor_${url.replace(/[^a-zA-Z0-9]/g, '_')}`;
}
