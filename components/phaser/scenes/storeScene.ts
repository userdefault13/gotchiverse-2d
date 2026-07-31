/**
 * MAP_ID_STORE — the entire map is a 16×16 store interior (1024×1024).
 * Client-only: import dynamically from store.scene.helper (never from SSR pages).
 */
import Phaser from 'phaser';
import GlobalState from 'contexts/GlobalState';
import {
  STORE_GRID,
  STORE_SPAWN_TX,
  STORE_SPAWN_TY,
  CASHIER_ITEM_ID_END,
  floorCellUrl,
  floorKey,
  furnitureAt,
  isCashierItemId,
  isConsoleItemId,
  isShelfItemId,
  isTerminalItemId,
  storeIsWalkable,
  storeStructureAt,
  storeTileCenter,
  type StoreFurniturePiece,
  type StoreLayout,
} from 'helpers/store.layout.helper';
import { getLocalConsoleUpgradeInfo } from 'helpers/console.installation.helper';
import { sendStoreMove, getStoreRoom } from 'helpers/colyseus.store';
import type { StoreSceneBuildState, StoreSceneCallbacks } from 'helpers/store.scene.helper';
import { MAP_CONFIG_BY_ID, MAP_ID_STORE, TILE_SIZE } from 'shared_code/constants/const.game';

type RemoteSprite = {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
};

const WALL_COLOR = 0x5c4033;
const WINDOW_COLOR = 0x88ccee;
const DOOR_COLOR = 0xa8d4ff;
const FLOOR_FALLBACK = 0x3a3a48;
const PLAYER_SPEED = 220;
/** Mint neon green — store build selection outline. */
const SELECT_MINT = 0x00f470;
const SELECT_PINK = 0xff2bd6;

export class StoreScene extends Phaser.Scene {
  private layout: StoreLayout | null = null;
  private callbacks: StoreSceneCallbacks | null = null;
  private build: StoreSceneBuildState = { buildMode: false, placeBrush: null, floorBrush: null, pendingPlace: null };

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
  /** Ghost sprite that follows the cursor while a place brush is active. */
  private placePreview: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle | null = null;
  private placePreviewItemId: number | null = null;
  private hoverTx = -1;
  private hoverTy = -1;
  /** piece.id → world sprite (for selection chrome). */
  private furnitureSprites = new Map<string, Phaser.GameObjects.GameObject>();
  private selectedPieceId: string | null = null;
  private selectUi: Phaser.GameObjects.Container | null = null;
  private selectHighlight: Phaser.GameObjects.GameObject | null = null;
  /** Floating E prompt above nearby Console furniture. */
  private consoleInteractPrompt: Phaser.GameObjects.Image | null = null;
  /** Extra horizontal look-offset while build inventory covers the right side. */
  private buildCamPanX = 0;
  private static readonly BUILD_HUD_BIAS_X = 240;
  private static readonly BUILD_PAN_STEP = 120;
  private static readonly BUILD_PAN_MAX = 480;

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
    if (!this.textures.exists('terminal')) {
      this.load.spritesheet('terminal', '/animations/installations/terminal.png', { frameWidth: 256, frameHeight: 256 });
    }
    if (!this.textures.exists('e_interact')) {
      this.load.image('e_interact', '/images/e_interact.png');
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
        // Selection chrome when no brush — click furniture to show UPGRADE/MOVE/REMOVE.
        if (this.build.placeBrush == null && this.build.floorBrush == null) {
          const piece = this.layout ? furnitureAt(this.layout, tx, ty) : null;
          if (piece) {
            this.setSelectedFurniture(piece);
            this.callbacks?.onSelectFurniture(piece);
            return;
          }
          this.clearSelectedFurniture();
          this.callbacks?.onSelectFurniture(null);
        } else {
          this.clearSelectedFurniture();
        }
        this.callbacks?.onBuildTileClick(tx, ty);
        return;
      }
      this.clearSelectedFurniture();
      const piece = this.layout ? furnitureAt(this.layout, tx, ty) : null;
      this.callbacks?.onSelectFurniture(piece || null);
      if (piece && isShelfItemId(piece.itemId)) this.callbacks?.onInteractShelf(piece);
      if (piece && isCashierItemId(piece.itemId)) this.callbacks?.onInteractCashier(piece);
      if (piece && isConsoleItemId(piece.itemId)) this.callbacks?.onInteractConsole(piece);
      if (piece && isTerminalItemId(piece.itemId)) this.callbacks?.onInteractTerminal(piece);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.updatePlacePreview(pointer);
    });

    sendStoreMove(spawn.x, spawn.y);
  }

  update(_t: number, dt: number) {
    if (!this.player) return;
    this.syncRemotes();
    if (this.build.buildMode && this.build.placeBrush != null && this.input.activePointer) {
      this.updatePlacePreview(this.input.activePointer);
    }

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

    this.updateConsoleInteractPrompt();
  }

  setLayout(layout: StoreLayout | null) {
    this.layout = layout;
    if (this.tileLayer) this.rebuildWorld();
    // Preview sits above furniture — refresh validity after layout changes.
    if (this.build.placeBrush != null && this.input?.activePointer) {
      this.updatePlacePreview(this.input.activePointer);
    }
  }

  setBuildState(build: StoreSceneBuildState) {
    const wasBuild = this.build.buildMode;
    this.build = { pendingPlace: null, ...build };
    if (build.buildMode !== wasBuild || build.buildMode) {
      this.applyBuildCamera();
    }
    if (!build.buildMode) {
      this.clearSelectedFurniture();
      this.clearPlacePreview();
      return;
    }
    if (build.placeBrush == null) {
      this.clearPlacePreview();
      return;
    }
    this.clearSelectedFurniture();
    this.ensurePlacePreview(build.placeBrush);
    if (build.pendingPlace) {
      this.pinPlacePreview(build.pendingPlace.tx, build.pendingPlace.ty);
      return;
    }
    const pointer = this.input?.activePointer;
    if (pointer) {
      this.updatePlacePreview(pointer);
      // Cursor over HUD — hide ghost (don't park on a random floor tile in the middle).
      if (this.hoverTx < 0 || this.hoverTx >= STORE_GRID || this.hoverTy < 0 || this.hoverTy >= STORE_GRID) {
        this.placePreview?.setVisible(false);
      }
    }
  }

  /** Nudge camera left/right in build mode so tiles clear the inventory tray. */
  nudgeBuildCamera(dir: -1 | 1) {
    if (!this.build.buildMode) return;
    this.buildCamPanX = Phaser.Math.Clamp(
      this.buildCamPanX + dir * StoreScene.BUILD_PAN_STEP,
      -StoreScene.BUILD_PAN_MAX,
      StoreScene.BUILD_PAN_MAX,
    );
    this.applyBuildCamera();
  }

  private applyBuildCamera() {
    if (!this.cameras?.main) return;
    if (this.build.buildMode) {
      this.cameras.main.setFollowOffset(-(StoreScene.BUILD_HUD_BIAS_X + this.buildCamPanX), 0);
    } else {
      this.buildCamPanX = 0;
      this.cameras.main.setFollowOffset(0, 0);
    }
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

  private textureKeyForItemId(itemId: number): string {
    if (isCashierItemId(itemId)) return 'cashier';
    if (isConsoleItemId(itemId)) return 'console';
    if (isTerminalItemId(itemId)) return 'terminal';
    return 'shelf';
  }

  private fallbackColorForItemId(itemId: number): number {
    if (isShelfItemId(itemId)) return 0xc4a574;
    if (isCashierItemId(itemId)) return 0x6bcb77;
    if (isTerminalItemId(itemId)) return 0x75fb92;
    return 0x4d96ff;
  }

  private canPlaceAt(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= STORE_GRID || ty >= STORE_GRID) return false;
    if (storeStructureAt(tx, ty) !== 'floor') return false;
    if (this.layout && furnitureAt(this.layout, tx, ty)) return false;
    return true;
  }

  private clearPlacePreview() {
    this.placePreview?.destroy();
    this.placePreview = null;
    this.placePreviewItemId = null;
    this.hoverTx = -1;
    this.hoverTy = -1;
  }

  private ensurePlacePreview(itemId: number) {
    if (this.placePreview && this.placePreviewItemId === itemId) return;
    this.clearPlacePreview();
    const key = this.textureKeyForItemId(itemId);
    if (this.textures.exists(key)) {
      const spr = this.add.sprite(0, 0, key, 0).setDisplaySize(TILE_SIZE * 0.95, TILE_SIZE * 0.95);
      spr.setDepth(25);
      spr.setAlpha(0.55);
      this.placePreview = spr;
    } else {
      const rect = this.add.rectangle(0, 0, TILE_SIZE * 0.8, TILE_SIZE * 0.8, this.fallbackColorForItemId(itemId), 0.55);
      rect.setDepth(25);
      this.placePreview = rect;
    }
    this.placePreviewItemId = itemId;
  }

  private pinPlacePreview(tx: number, ty: number) {
    this.ensurePlacePreview(this.build.placeBrush!);
    const preview = this.placePreview;
    if (!preview) return;
    const cx = tx * TILE_SIZE + TILE_SIZE / 2;
    const cy = ty * TILE_SIZE + TILE_SIZE / 2;
    this.hoverTx = tx;
    this.hoverTy = ty;
    preview.setPosition(cx, cy);
    preview.setVisible(true);
    const valid = this.canPlaceAt(tx, ty);
    if (preview instanceof Phaser.GameObjects.Sprite) {
      if (valid) preview.clearTint();
      else preview.setTint(0xff4f78);
      preview.setAlpha(valid ? 0.85 : 0.45);
    } else if (preview instanceof Phaser.GameObjects.Rectangle) {
      preview.setFillStyle(valid ? 0x63f323 : 0xff4f78, valid ? 0.7 : 0.4);
    }
  }

  private updatePlacePreview(pointer: Phaser.Input.Pointer) {
    if (!this.build.buildMode || this.build.placeBrush == null) {
      this.clearPlacePreview();
      return;
    }
    // Locked target from click — stay put until Confirm / cancel.
    if (this.build.pendingPlace) {
      this.pinPlacePreview(this.build.pendingPlace.tx, this.build.pendingPlace.ty);
      return;
    }
    this.ensurePlacePreview(this.build.placeBrush);

    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tx = Math.floor(world.x / TILE_SIZE);
    const ty = Math.floor(world.y / TILE_SIZE);
    this.hoverTx = tx;
    this.hoverTy = ty;

    const preview = this.placePreview;
    if (!preview) return;

    if (tx < 0 || ty < 0 || tx >= STORE_GRID || ty >= STORE_GRID) {
      preview.setVisible(false);
      return;
    }

    const cx = tx * TILE_SIZE + TILE_SIZE / 2;
    const cy = ty * TILE_SIZE + TILE_SIZE / 2;
    preview.setPosition(cx, cy);
    preview.setVisible(true);

    const valid = this.canPlaceAt(tx, ty);
    if (preview instanceof Phaser.GameObjects.Sprite) {
      if (valid) preview.clearTint();
      else preview.setTint(0xff4f78);
      preview.setAlpha(valid ? 0.65 : 0.45);
    } else if (preview instanceof Phaser.GameObjects.Rectangle) {
      preview.setFillStyle(valid ? 0x63f323 : 0xff4f78, valid ? 0.55 : 0.4);
    }
  }

  private rebuildWorld() {
    this.clearSelectedFurniture();
    this.furnitureSprites.clear();
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
      if (isTerminalItemId(piece.itemId)) key = 'terminal';
      let spr: Phaser.GameObjects.GameObject;
      if (this.textures.exists(key)) {
        const s = this.add.sprite(cx, cy, key, 0).setDisplaySize(TILE_SIZE * 0.95, TILE_SIZE * 0.95);
        spr = s;
      } else {
        const color = isShelfItemId(piece.itemId)
          ? 0xc4a574
          : isCashierItemId(piece.itemId)
            ? 0x6bcb77
            : isTerminalItemId(piece.itemId)
              ? 0x75fb92
              : 0x4d96ff;
        spr = this.add.rectangle(cx, cy, TILE_SIZE * 0.8, TILE_SIZE * 0.8, color);
      }
      this.furnitureLayer?.add(spr);
      this.furnitureSprites.set(piece.id, spr);
      this.blocked.add(`${piece.x},${piece.y}`);
    });
  }

  private canUpgradePiece(piece: StoreFurniturePiece): boolean {
    if (isConsoleItemId(piece.itemId)) {
      return Boolean(getLocalConsoleUpgradeInfo(piece.itemId)?.next);
    }
    if (isCashierItemId(piece.itemId)) {
      return Number(piece.itemId) < CASHIER_ITEM_ID_END;
    }
    return false;
  }

  private clearSelectedFurniture() {
    this.selectedPieceId = null;
    this.selectUi?.destroy(true);
    this.selectUi = null;
    this.selectHighlight?.destroy();
    this.selectHighlight = null;
  }

  private setSelectedFurniture(piece: StoreFurniturePiece) {
    this.clearSelectedFurniture();
    this.selectedPieceId = piece.id;
    const spr = this.furnitureSprites.get(piece.id);
    if (!spr || !('x' in spr) || !('y' in spr)) return;

    const x = (spr as Phaser.GameObjects.Sprite).x;
    const y = (spr as Phaser.GameObjects.Sprite).y;

    // Pink plate + mint border with furniture preview on top (parcel selection look).
    const frame = this.add.container(x, y).setDepth(25);
    const plate = this.add.rectangle(0, 0, TILE_SIZE * 0.98, TILE_SIZE * 0.98, SELECT_PINK, 0.92);
    plate.setStrokeStyle(5, SELECT_MINT, 1);
    frame.add(plate);
    const texKey = this.textureKeyForItemId(piece.itemId);
    if (this.textures.exists(texKey)) {
      const preview = this.add.sprite(0, 0, texKey, 0).setDisplaySize(TILE_SIZE * 0.85, TILE_SIZE * 0.85);
      frame.add(preview);
    }
    this.selectHighlight = frame;

    const ui = this.add.container(x, y + TILE_SIZE * 0.55).setDepth(40);
    this.selectUi = ui;

    let yOff = 0;
    if (this.canUpgradePiece(piece) && this.textures.exists('upgradeBtn')) {
      const upgradeBtn = this.add
        .image(0, yOff, this.textures.exists('upgradeBtnIcon') ? 'upgradeBtnIcon' : 'upgradeBtn')
        .setOrigin(0.5, 0)
        .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' });
      upgradeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation?.();
        this.callbacks?.onUpgradeFurniture?.(piece);
        this.clearSelectedFurniture();
      });
      ui.add(upgradeBtn);
      yOff += upgradeBtn.displayHeight + 6;
    } else if (this.canUpgradePiece(piece)) {
      const upgradeBtn = this.add
        .rectangle(0, yOff + 16, 110, 32, 0x00bfa5)
        .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' });
      const upgradeLabel = this.add
        .text(0, yOff + 16, 'UPGRADE', { fontFamily: 'Pixelar', fontSize: '18px', color: '#ffffff' })
        .setOrigin(0.5);
      upgradeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation?.();
        this.callbacks?.onUpgradeFurniture?.(piece);
        this.clearSelectedFurniture();
      });
      ui.add(upgradeBtn);
      ui.add(upgradeLabel);
      yOff += 40;
    }

    const rowY = yOff + 20;
    if (this.textures.exists('moveBtn')) {
      const moveBtn = this.add
        .image(-28, rowY, 'moveBtn')
        .setOrigin(0.5)
        .setDisplaySize(80, 40)
        .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' });
      moveBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation?.();
        this.callbacks?.onMoveFurniture?.(piece);
        this.clearSelectedFurniture();
      });
      ui.add(moveBtn);
    } else {
      const moveBtn = this.add
        .rectangle(-28, rowY, 72, 36, 0x7b5cff)
        .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' });
      const moveLabel = this.add
        .text(-28, rowY, 'MOVE', { fontFamily: 'Pixelar', fontSize: '16px', color: '#ffffff' })
        .setOrigin(0.5);
      moveBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation?.();
        this.callbacks?.onMoveFurniture?.(piece);
        this.clearSelectedFurniture();
      });
      ui.add(moveBtn);
      ui.add(moveLabel);
    }

    if (this.textures.exists('removeBtn')) {
      const removeBtn = this.add
        .image(40, rowY, 'removeBtn')
        .setOrigin(0.5)
        .setDisplaySize(40, 40)
        .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' });
      removeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation?.();
        this.callbacks?.onRemoveFurniture?.(piece);
        this.clearSelectedFurniture();
      });
      ui.add(removeBtn);
    } else {
      const removeBtn = this.add
        .rectangle(40, rowY, 36, 36, 0xe53935)
        .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' });
      const removeLabel = this.add
        .text(40, rowY, '✕', { fontFamily: 'Pixelar', fontSize: '20px', color: '#ffffff' })
        .setOrigin(0.5);
      removeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation?.();
        this.callbacks?.onRemoveFurniture?.(piece);
        this.clearSelectedFurniture();
      });
      ui.add(removeBtn);
      ui.add(removeLabel);
    }
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

  private getNearbyFurniture(): StoreFurniturePiece[] {
    if (!this.layout || !this.player) return [];
    const { tx, ty } = this.getPlayerTile();
    const under = furnitureAt(this.layout, tx, ty);
    return [
      under,
      furnitureAt(this.layout, tx, ty - 1),
      furnitureAt(this.layout, tx, ty + 1),
      furnitureAt(this.layout, tx - 1, ty),
      furnitureAt(this.layout, tx + 1, ty),
    ].filter(Boolean) as StoreFurniturePiece[];
  }

  private getNearbyConsole(): StoreFurniturePiece | null {
    if (this.build.buildMode) return null;
    return this.getNearbyFurniture().find((p) => isConsoleItemId(p.itemId)) || null;
  }

  private hideConsoleInteractPrompt() {
    if (!this.consoleInteractPrompt) return;
    this.consoleInteractPrompt.setVisible(false);
    this.consoleInteractPrompt.setActive(false);
  }

  private updateConsoleInteractPrompt() {
    const piece = this.getNearbyConsole();
    if (!piece || !this.textures.exists('e_interact')) {
      this.hideConsoleInteractPrompt();
      return;
    }
    const spr = this.furnitureSprites.get(piece.id);
    let x = piece.x * TILE_SIZE + TILE_SIZE / 2;
    let y = piece.y * TILE_SIZE + TILE_SIZE / 2 - 48;
    if (spr && 'x' in spr && 'y' in spr) {
      x = (spr as Phaser.GameObjects.Sprite).x;
      y = (spr as Phaser.GameObjects.Sprite).y - 48;
    }
    if (!this.consoleInteractPrompt) {
      const img = this.add
        .image(x, y, 'e_interact')
        .setOrigin(0.5)
        .setScale(0.7)
        .setDepth(60)
        .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' });
      img.setName('e_interact');
      img.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation?.();
        this.tryInteract();
      });
      this.consoleInteractPrompt = img;
    } else {
      this.consoleInteractPrompt.setPosition(x, y);
      this.consoleInteractPrompt.setVisible(true);
      this.consoleInteractPrompt.setActive(true);
    }
  }

  private tryInteract() {
    // Prefer Console when nearby so E / prompt always opens arcade first.
    const nearby = this.getNearbyFurniture();
    const consolePiece = nearby.find((p) => isConsoleItemId(p.itemId));
    const piece = consolePiece || nearby[0];
    if (!piece) return;
    if (isShelfItemId(piece.itemId)) this.callbacks?.onInteractShelf(piece);
    else if (isCashierItemId(piece.itemId)) this.callbacks?.onInteractCashier(piece);
    else if (isConsoleItemId(piece.itemId)) this.callbacks?.onInteractConsole(piece);
    else if (isTerminalItemId(piece.itemId)) this.callbacks?.onInteractTerminal(piece);
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
