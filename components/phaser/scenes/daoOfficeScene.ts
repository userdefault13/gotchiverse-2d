/**
 * MAP_ID_DAO_OFFICE — 8×8 DAO satellite office (world tent / humble parcel footprint).
 * Walls: Dungeon Gathering Set 1. Client-only via daoOffice.scene.helper.
 */
import Phaser from 'phaser';
import GlobalState from 'contexts/GlobalState';
import {
  DAO_OFFICE_GRID,
  DAO_OFFICE_SPAWN_TX,
  DAO_OFFICE_SPAWN_TY,
  daoOfficeFloorFrameFor,
  daoOfficeIsWalkable,
  daoOfficeStructureAt,
  daoOfficeTileCenter,
  daoOfficeWallFrameFor,
  floorKey,
  type DaoOfficeLayout,
} from 'helpers/daoOffice.layout.helper';
import { floorCellUrl, greyscaleBaseUrl, STORE_BASE_SHADE_IDS } from 'helpers/store.layout.helper';
import {
  DUNGEON_WALLS_FRAME,
  DUNGEON_WALLS_KEY,
  DUNGEON_WALLS_PATH,
} from 'helpers/dungeonWalls.helper';
import { sendDaoOfficeMove, getDaoOfficeRoom } from 'helpers/colyseus.daoOffice';
import type { DaoOfficeSceneCallbacks } from 'helpers/daoOffice.scene.helper';
import { MAP_CONFIG_BY_ID, MAP_ID_DAO_OFFICE, TILE_SIZE } from 'shared_code/constants/const.game';

type RemoteSprite = {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
};

const FLOOR_FALLBACK = 0x1a2838;
const PLAYER_SPEED = 220;

export class DaoOfficeScene extends Phaser.Scene {
  private layout: DaoOfficeLayout | null = null;
  private callbacks: DaoOfficeSceneCallbacks | null = null;

  private tileLayer: Phaser.GameObjects.Container | null = null;
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private lastMoveSent = 0;
  private facing = 0;
  private blocked = new Set<string>();
  private remotes = new Map<string, RemoteSprite>();
  private doorCooldownUntil = 0;
  private gotchiTextureKey = '';

  constructor() {
    super({ key: MAP_ID_DAO_OFFICE });
  }

  init(data: { layout?: DaoOfficeLayout | null; callbacks?: DaoOfficeSceneCallbacks }) {
    this.layout = data?.layout || null;
    this.callbacks = data?.callbacks || null;
    this.doorCooldownUntil = this.time.now + 800;
  }

  preload() {
    const gotchiId = String(GlobalState.REALM?.state?.selectedPlayer?.id || '');
    const spriteUrl = GlobalState.REALM?.state?.gotchiUrl?.sprite || '';
    if (gotchiId && this.textures.exists(gotchiId)) {
      this.gotchiTextureKey = gotchiId;
    } else if (spriteUrl && gotchiId) {
      this.gotchiTextureKey = gotchiId;
      if (!this.textures.exists(gotchiId)) {
        this.load.spritesheet(gotchiId, spriteUrl, { frameWidth: 64, frameHeight: 64 });
      }
    }

    if (!this.textures.exists(DUNGEON_WALLS_KEY)) {
      this.load.spritesheet(DUNGEON_WALLS_KEY, DUNGEON_WALLS_PATH, {
        frameWidth: DUNGEON_WALLS_FRAME,
        frameHeight: DUNGEON_WALLS_FRAME,
      });
    }

    const floor = this.layout?.floor || {};
    const urls = new Set<string>();
    Object.values(floor).forEach((cell) => {
      const url = floorCellUrl(cell);
      if (url) urls.add(url);
    });
    STORE_BASE_SHADE_IDS.forEach((id) => {
      urls.add(greyscaleBaseUrl(id));
    });
    urls.forEach((url) => {
      const key = floorTexKey(url);
      if (!this.textures.exists(key)) this.load.image(key, url);
    });
  }

  create() {
    const cfg = MAP_CONFIG_BY_ID[MAP_ID_DAO_OFFICE];
    this.cameras.main.setBackgroundColor('#0a1520');
    this.cameras.main.setBounds(0, 0, cfg.WIDTH, cfg.HEIGHT);

    this.tileLayer = this.add.container(0, 0).setDepth(0);
    this.rebuildWorld();

    const spawn = daoOfficeTileCenter(DAO_OFFICE_SPAWN_TX, DAO_OFFICE_SPAWN_TY);
    this.player = this.add.container(spawn.x, spawn.y).setDepth(50);
    if (this.textures.exists(this.gotchiTextureKey)) {
      this.playerSprite = this.add.sprite(0, 0, this.gotchiTextureKey, 0);
      this.playerSprite.setDisplaySize(64, 64);
    } else {
      this.playerSprite = this.add.rectangle(0, 0, 40, 40, 0x7ec8ff);
    }
    this.player.add(this.playerSprite);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(Math.min(2.6, Math.max(1.4, 720 / cfg.WIDTH)));

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D') as DaoOfficeScene['wasd'];
    }

    sendDaoOfficeMove(spawn.x, spawn.y);
  }

  setCallbacks(callbacks: DaoOfficeSceneCallbacks) {
    this.callbacks = callbacks;
  }

  setLayout(layout: DaoOfficeLayout | null) {
    this.layout = layout;
    if (this.tileLayer) this.rebuildWorld();
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
        sendDaoOfficeMove(Math.round(resolved.x), Math.round(resolved.y));
      }
    }

    if (this.time.now > this.doorCooldownUntil) {
      const tx = Math.floor(this.player.x / TILE_SIZE);
      const ty = Math.floor(this.player.y / TILE_SIZE);
      if (daoOfficeStructureAt(tx, ty) === 'door' && vy > 0) {
        this.callbacks?.onLeaveDoor();
      }
    }
  }

  private rebuildWorld() {
    this.tileLayer?.removeAll(true);
    this.blocked.clear();
    const hasWalls = this.textures.exists(DUNGEON_WALLS_KEY);

    for (let ty = 0; ty < DAO_OFFICE_GRID; ty += 1) {
      for (let tx = 0; tx < DAO_OFFICE_GRID; tx += 1) {
        const kind = daoOfficeStructureAt(tx, ty);
        const cx = tx * TILE_SIZE + TILE_SIZE / 2;
        const cy = ty * TILE_SIZE + TILE_SIZE / 2;
        if (kind === 'wall' || kind === 'window' || kind === 'door') {
          if (hasWalls) {
            const frame = daoOfficeWallFrameFor(tx, ty, kind, DAO_OFFICE_GRID);
            this.tileLayer?.add(
              this.add.sprite(cx, cy, DUNGEON_WALLS_KEY, frame).setDisplaySize(TILE_SIZE, TILE_SIZE),
            );
          } else {
            const color = kind === 'door' ? 0xa8d4ff : kind === 'window' ? 0x88ccee : 0x2a3a4a;
            this.tileLayer?.add(this.add.rectangle(cx, cy, TILE_SIZE - 2, TILE_SIZE - 2, color, kind === 'wall' ? 1 : 0.85));
          }
          if (kind !== 'door') this.blocked.add(`${tx},${ty}`);
        } else {
          const cell = this.layout?.floor?.[floorKey(tx, ty)];
          const url = floorCellUrl(cell);
          const key = url ? floorTexKey(url) : '';
          if (key && this.textures.exists(key)) {
            this.tileLayer?.add(this.add.image(cx, cy, key).setDisplaySize(TILE_SIZE, TILE_SIZE));
          } else if (hasWalls) {
            this.tileLayer?.add(
              this.add
                .sprite(cx, cy, DUNGEON_WALLS_KEY, daoOfficeFloorFrameFor(tx, ty))
                .setDisplaySize(TILE_SIZE, TILE_SIZE),
            );
          } else {
            this.tileLayer?.add(this.add.rectangle(cx, cy, TILE_SIZE - 1, TILE_SIZE - 1, FLOOR_FALLBACK));
          }
        }
      }
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
        if (!daoOfficeIsWalkable(tx, ty)) return false;
        if (this.blocked.has(`${tx},${ty}`) && daoOfficeStructureAt(tx, ty) === 'floor') return false;
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

  private syncRemotes() {
    const room = getDaoOfficeRoom();
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
    this.remotes.forEach((remote, sessionId) => {
      if (!seen.has(sessionId)) {
        remote.container.destroy(true);
        this.remotes.delete(sessionId);
      }
    });
  }
}

function floorTexKey(url: string): string {
  return `dao_office_floor_${url.replace(/[^a-zA-Z0-9]/g, '_')}`;
}
