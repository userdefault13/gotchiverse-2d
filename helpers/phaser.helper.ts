import Parcels from 'components/phaser/Parcels';
import { Damage, Parcel, SelectedPlayer, Vector2 } from 'types';
import _ from 'lodash';
import { scene } from 'components/controllers/SceneController';
import { TILE_SIZE } from 'shared_code/constants/const.game';
import Players from 'components/phaser/Players';
import GlobalState from 'contexts/GlobalState';
import GameController from 'components/controllers/GameController';
import Router from 'next/router';
import InputController from 'components/controllers/inputController';

// Added a new zoom step to calculate the actual zoom based on a scale 50  means 3 positions.
const USE_FREE_ZOOM = true;
export const ZOOM_STEP = USE_FREE_ZOOM ? 5 : 100; // Default step for react slider is 5, adjust your steps only if !USE_FREE_ZOOM is true

const DEFAULT_ZOOM = 1;
let ALLOW_UNLIMITED_ZOOM_OUT = false;
let WINDOW_WIDTH = 0;
let WINDOW_HEIGHT = 0;
let WINDOW_RATIO = 1;
let ACTIVE_PARCEL = null;
let MAX_ZOOM_OUT = 0.25;
const MAX_ZOOM_IN = 1;

let lastZoomTween;

const ZOOM_FACTOR = 1.2;
const ZOOM_DURATION = 100;
const MAP_SIZE = { width: 17408, height: 10240 };
const MID_POINT = { x: 0, y: 0 };
const CAMERA_BOUNDS = { left: 0, right: 0 };
const STAR_FIELD = { width: 0, height: 0, midX: 0, midY: 0 };
const AOI = { width: 0, height: 0 };

export const showDamage = (damage: Damage): void => {
  // Do not show animation if player died, bc we calculate the diff to get the DP (damage points) when player dies.
  if (damage.playerDied) return;
  const { id } = damage;
  const objectType = id.split('-')[0];

  const gameObject = objectType === 'GMLS' || objectType === 'PLM2' ? scene.enemiesGroup.get(id)[1] : scene[damage.id + '_top'];
  const damagePoints = damage.damage; // Use the `damage` field from the FE, because basing it on health is often wrong due to sync issues
  if (!damagePoints) return;
  let pixels = (1 - scene.zoom) * 100;
  pixels = pixels <= 34 ? 34 : pixels;
  pixels = pixels > 80 ? 100 : pixels;
  const yOffset = pixels + 50;
  const damageAnim = scene.add
    .text(0, 0, '-' + damagePoints.toFixed(0).toString(), {
      fontFamily: 'Pixelar',
      fontSize: pixels + 'px',
      stroke: 'bold',
      color: '#f31ced',
    })
    .setName('damagePointAnim');
  gameObject?.add(damageAnim);
  damageAnim.setStroke('#fff', 3).setDepth(500).setOrigin(0.5);
  scene.tweens.add({
    targets: [damageAnim],
    props: {
      alpha: { value: 0, delay: 200, duration: 800, ease: 'Linear' },
      y: { value: `-=${yOffset}`, duration: 800, ease: 'Power2' },
    },
    onComplete: () => {
      damageAnim.destroy();
    },
  });
};

export const interpolatePositionUpdate = (
  object: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | Phaser.GameObjects.Container | Phaser.GameObjects.Graphics,
  position: { x: number; y: number },
  FPSMultiplier?: number,
): void => {
  if (!scene || !object) return;
  const duration = FPSMultiplier
    ? FPSMultiplier * GlobalState.GAME.state.gameConfig.gameUpdateIntervalMS
    : GlobalState.GAME.state.gameConfig.gameUpdateIntervalMS;
  scene.tweens.add({
    targets: object,
    x: position.x,
    y: position.y,
    duration,
  });
};

export function setDefaultZoom(width, height, AOIHeight?: number, AOIWidth?: number) {
  MAP_SIZE.width = width;
  MAP_SIZE.height = height;
  AOI.width = AOIWidth || width;
  AOI.height = AOIHeight || height;
  MID_POINT.x = width * 0.5;
  MID_POINT.y = height * 0.5;
  CAMERA_BOUNDS.left = (width - WINDOW_WIDTH / MAX_ZOOM_OUT) * 0.5;
  CAMERA_BOUNDS.right = width - CAMERA_BOUNDS.left;
}

export function toggleUnlimitedZoomOut(allowUnlimitedZoomOutState) {
  if (ALLOW_UNLIMITED_ZOOM_OUT !== allowUnlimitedZoomOutState) {
    ALLOW_UNLIMITED_ZOOM_OUT = allowUnlimitedZoomOutState;
    CAMERA_BOUNDS.left = (MAP_SIZE.width - window.innerWidth / MAX_ZOOM_OUT) * 0.5;
    CAMERA_BOUNDS.right = MAP_SIZE.width - CAMERA_BOUNDS.left;
    setZoomDefaults();
  }
}

export const getMapPos = (): string => {
  try {
    const id = Players?.selectedPlayer?.id;
    if (!id || !scene) return '—, —';
    const spr = scene[id] || scene[String(id)];
    if (!spr || typeof spr.x !== 'number' || typeof spr.y !== 'number') return '—, —';
    return `${Number(spr.x).toFixed(0)}, ${Number(spr.y).toFixed(0)}`;
  } catch {
    return '—, —';
  }
};

export function getDefaultCameraSettings() {
  return {
    zoom: MAX_ZOOM_OUT || WINDOW_WIDTH / MAP_SIZE.width,
    left: CAMERA_BOUNDS.left,
    right: CAMERA_BOUNDS.right,
    width: MAP_SIZE.width,
    height: MAP_SIZE.height,
  };
}

export const getAngleByDirV2 = (dir: Vector2): number => {
  return (Math.atan2(dir.y, dir.x) * 180) / Math.PI; // correct way to get angle
  // return 50 * Math.atan2(dir.y, dir.x) - 90;
};

export function getPhaserDirV2(player: Vector2, target: Vector2): number {
  return Math.atan((target.x - player.x) / (target.y - player.y));
}

export function getPhaserAngleByDirV2(dir: Vector2): number {
  const angleInRad = new Phaser.Math.Vector2(dir.x, dir.y).angle(); // angle in radians
  return Phaser.Math.RadToDeg(angleInRad); // return angle in degrees
}
// const sub = subtractVectors(pointerWorld, player);
// const phaserAngle = new Phaser.Math.Vector2(sub.x, sub.y);
// return Phaser.Math.RadToDeg(phaserAngle.angle());

export function getAngleByDir(dir: Vector2): number {
  const angle = Math.atan2(dir.x, dir.y) + 90;
  const degree = (180 * angle) / Math.PI;
  return (360 + Math.round(degree)) % 360;
  // return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI);
}

export function getDirectionByPosition(currentPosition: Vector2, targetPosition: Vector2): Vector2 {
  const currentVec = new Phaser.Math.Vector2(currentPosition.x, currentPosition.y);
  const targetVec = new Phaser.Math.Vector2(targetPosition.x, targetPosition.y);
  const directionVec = targetVec.subtract(currentVec).normalize();

  const { x, y } = directionVec;
  // check and see what absolute val of x and y is bigger to determine what will be the direction if both of them are 1.
  const lead = Math.abs(x) >= Math.abs(y) ? 'x' : 'y';

  for (const prop in directionVec) {
    // for the lead return -1 if value is lower than -0.5 or 1 if is bigger than 0.5. For the other prop return 0.
    directionVec[prop] = prop === lead ? (directionVec[prop] < -0.5 ? -1 : 1) : 0;
  }
  return directionVec;
}

export function addGrid(x, y, width, height) {
  if (!scene.grid) {
    // const grid = scene.add.grid(scene.map.widthInPixels / 2, scene.map.heightInPixels / 2, scene.map.widthInPixels, scene.map.heightInPixels, 32, 32);
    // scene.grid = scene.add.grid(x, y, width, height, 32, 32);
    // scene.grid.setDepth(-1);
    // scene.grid.setAlpha(0.4);
    // scene.grid.setOutlineStyle(0x7f00ff);
  }
}

export function createParallax(): void {
  scene.timer = 0;
  const bgWidth = window.innerWidth;
  const bgHeight = window.innerHeight;
  scene.stars = scene.add.tileSprite(0, 0, bgWidth, bgHeight, 'stars', 0).setOrigin(0.5);
  // scene.stars.setBlendMode(Phaser.BlendModes.ADD);
  scene.stars.setDepth(-2);

  scene.starField = scene.add.tileSprite(0, 0, bgWidth, bgHeight, 'large_starfield').setOrigin(0.5);
  // scene.starField.setBlendMode(Phaser.BlendModes.ADD);
  scene.starField.setDepth(-3);
  scene.starsFrame = 0;
  scene.starFieldFrame = 0;
  // scene.stars.setAlpha(0);
  // scene.starField.setAlpha(0);

  STAR_FIELD.width = bgWidth;
  STAR_FIELD.height = bgHeight;
  STAR_FIELD.midX = bgWidth * 0.5;
  STAR_FIELD.midY = bgHeight * 0.5;

  // hide the starfields until the first update to avoid FOUC
  // scene.stars.setAlpha(0);
  // scene.starField.setAlpha(0);
  // scene.stars.setScale(0.23);
  // scene.starField.setScale(0.23);
  scene.stars.x = scene.starField.x = STAR_FIELD.midX;
  scene.stars.y = scene.starField.y = STAR_FIELD.midY;
}
export const random = (list) => {
  return list[Math.floor(Math.random() * list.length)];
};

export function randomIntInRange(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

export function updateParallax({ id }: SelectedPlayer, delta: number): void {
  if (!scene.stars || !scene.starField || !scene[id]) return;
  const scrollX = scene.cameras.main.scrollX; // scene.cameras.main.worldView.x;
  const scrollY = scene.cameras.main.scrollY; // scene.cameras.main.worldView.y;

  // star field width = 5160
  // star field height = 2865
  // 2383 1321
  scene.stars.setTilePosition(scrollX * 0.02, scrollY * 0.02);
  scene.starField.setTilePosition(scrollX * 0.04, scrollY * 0.04);
  if (id && scene[id]) {
    // given we want a star BG scale value of 4 at .2 zoom (max zoom out) and 3 at 2 zoom (max zoom in)
    // handy: https://www.dcode.fr/function-equation-finder
    const zoomEquationValue = 4.33333 - 1.66667 * scene.zoom;
    scene.stars.setScale(zoomEquationValue);
    scene.starField.setScale(zoomEquationValue);
    if (scene.stars.width * scene.zoom < window.innerWidth) {
      scene.stars.width = scene.starField.width = window.innerWidth / scene.zoom;
    }
    if (scene.stars.height * scene.zoom < window.innerHeight) {
      scene.stars.height = scene.starField.height = window.innerHeight / scene.zoom;
    }
    if (scrollX > 0) {
      scene.stars.x = scene.starField.x = Phaser.Math.Clamp(scene[id].x, STAR_FIELD.midX, MAP_SIZE.width - STAR_FIELD.midX);
    }
    if (scrollY > 0) {
      scene.stars.y = scene.starField.y = Phaser.Math.Clamp(scene[id].y, STAR_FIELD.midY, MAP_SIZE.height - STAR_FIELD.midY);
    }
  }
  // create manual animation
  scene.timer += delta;
  if (scene.timer > 400) {
    scene.timer -= 400;
    scene.stars.setFrame(scene.starsFrame);
    scene.starsFrame++;
    scene.starFieldFrame++;
    if (scene.starsFrame === 3) {
      scene.starsFrame = 0;
    }
  }
}

export function addText(currentAccount: string): void {
  const text = `account:${currentAccount}`;
  scene.add.text(16, 16, text).setFontSize(22).setFontFamily('Pixelar').setColor('#00ffff');
}

export const toggleFollowGotchi = (state: boolean): void => {
  if (state) scene.cameras.main.startFollow(scene[Players.selectedPlayer.id], true);
  else scene.cameras.main.stopFollow();
};

export const focusParcel = (parcel: Parcel): void => {
  // focus parcel when build mode triggered
  const { position, size } = parcel;
  const x = (position.x + size.width / 2) * 64;
  const y = (position.y + size.height / 2) * 64;

  ACTIVE_PARCEL = {
    position: { x: x, y: y },
    size: { width: size.width * 64, height: size.height * 64 },
  };
  toggleFollowGotchi(false);
  dragMap(true);
};

export const focusContainer = (container?: Phaser.GameObjects.Container, offset?: Vector2, disableMovement?: boolean): void => {
  if (!scene?.cameras?.main) return;

  if (container) {
    toggleFollowGotchi(false);
    if (disableMovement) InputController.updateDisableKeyboard(true, true);
    scene.cameras.main.pan(container.x + offset.x, container.y + offset.y);
  } else {
    const selectedPlayer = scene[Players.selectedPlayer.id];
    if (!selectedPlayer) return;
    scene.cameras.main.pan(selectedPlayer.x, selectedPlayer.y);
    setTimeout(() => {
      toggleFollowGotchi(true);
      if (disableMovement) InputController.updateDisableKeyboard(false, true);
    }, 1000);
  }
};

const throttleZoomLevel = _.throttle(
  (deltaY) => {
    let newZoom = deltaY < 0 ? scene.zoom * ZOOM_FACTOR : scene.zoom / ZOOM_FACTOR;
    if (newZoom > MAX_ZOOM_IN) newZoom = MAX_ZOOM_IN;
    if (newZoom < MAX_ZOOM_OUT) newZoom = MAX_ZOOM_OUT;
    setZoomLevel(newZoom);
  },
  ZOOM_DURATION,
  { leading: true, trailing: true },
);

export function toggleZooming(state: boolean): void {
  if (!scene.zoom) scene.zoom = MAX_ZOOM_OUT;
  if (state) {
    scene.input.on('wheel', (pointer, gameobjects, deltaX, deltaY, deltaZ) => {
      throttleZoomLevel(deltaY);
    });
  } else {
    scene.input.off('wheel');
  }
}

// simple promise to wait or waitTime miliseconds.
// every time we're using wait we need to check if we're still on game page and safe to continue.
export const wait = async (waitTime: number): Promise<boolean> => {
  return await new Promise((resolve) => {
    _.delay(() => {
      const isOnPlayPage = Router.route === GameController.getGameRoute();
      if (!isOnPlayPage || !GlobalState.PHASER.state.socketConnected) return resolve(false);
      resolve(true);
    }, waitTime);
  });
};

// get a phaser object by group
export const getGroupMemberById = (
  id: string,
  group: 'missiles' | 'meleeGroup' | 'enemiesGroup',
): Phaser.GameObjects.Container | Phaser.GameObjects.Sprite => {
  if (!scene?.[group]) return;
  return scene[group].get(id);
};

export function checkMinimumZoom() {
  if (!scene) return;
  if (scene.zoom < MAX_ZOOM_OUT && !ALLOW_UNLIMITED_ZOOM_OUT) {
    // we are allowing zoom out to 175% of AOI size
    // this 25% leeway should still allow enough time to preload the next zone while moving
    scene.zoom = MAX_ZOOM_OUT || (WINDOW_WIDTH / WINDOW_RATIO / AOI.width) * 1.75;
  }
}
export function createContainer(width: number, height: number, debugFill?: boolean): Phaser.GameObjects.Container {
  const container = scene.add?.container(0, 0);
  container.setSize(width, height);

  if (debugFill) {
    const rect = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height);
    const graphics = scene.add.graphics();
    graphics.fillRectShape(rect).fillStyle(0xfffff);
    graphics.setName('mask');
    container.add(graphics);
  }
  return container;
}

export const dragMap = (state: boolean): void => {
  if (!scene) return;
  // @ts-expect-error
  const drag = scene.plugins.get('rexpinchplugin').add(scene);
  if (state && ACTIVE_PARCEL) {
    drag.on('drag1', (_drag) => {
      const width = WINDOW_WIDTH * 0.5;
      const height = WINDOW_HEIGHT * 0.5;
      const centreX = Math.round(ACTIVE_PARCEL.position.x - width);
      const centreY = Math.round(ACTIVE_PARCEL.position.y - height);
      const parcelWidth = Math.round(ACTIVE_PARCEL.size.width * 0.25);
      const parcelHeight = Math.round(ACTIVE_PARCEL.size.height * 0.25);
      const left = centreX - parcelWidth;
      const right = centreX + parcelWidth;
      const top = centreY - parcelHeight;
      const bottom = centreY + parcelHeight;

      let scrollX = scene.cameras.main.scrollX - _drag.drag1Vector.x / scene.cameras.main.zoom;
      let scrollY = scene.cameras.main.scrollY - _drag.drag1Vector.y / scene.cameras.main.zoom;

      if (scrollX > right) scrollX = right;
      else if (scrollX < left) scrollX = left;
      if (scrollY > bottom) scrollY = bottom;
      else if (scrollY < top) scrollY = top;

      scene.cameras.main.scrollX = scrollX;
      scene.cameras.main.scrollY = scrollY;
    });
  } else drag.off('drag1');
};

export function setZoomLevel(zoomLevel: number, duration = 0): void {
  //  set zoom level based on step .
  // console.log('@setZoomLevel', zoomLevel);

  if (!USE_FREE_ZOOM) {
    const stepSize = 1 / (100 / ZOOM_STEP);
    zoomLevel = zoomLevel > scene.zoom ? Math.ceil(zoomLevel / stepSize) * stepSize : Math.floor(zoomLevel / stepSize) * stepSize;
  }
  let updatedZoomLevel = Phaser.Math.Clamp(zoomLevel, MAX_ZOOM_OUT, MAX_ZOOM_IN);

  updatedZoomLevel = Math.round(updatedZoomLevel * 64) / 64;

  if (lastZoomTween?.isPlaying()) {
    lastZoomTween.stop();
    lastZoomTween.remove();
  }
  lastZoomTween = scene.tweens.addCounter({
    from: scene.zoom,
    to: updatedZoomLevel,
    duration: duration || ZOOM_DURATION,
    // ease: Phaser.Math.Easing.Quartic.In,
    onUpdate: (tween) => {
      updateZoomLevel(tween.getValue());
    },
  });
}

export function setZoomDefaults(init?: boolean): void {
  WINDOW_WIDTH = Number(window.innerWidth);
  WINDOW_HEIGHT = Number(window.innerHeight);

  WINDOW_RATIO = 1;

  if (WINDOW_HEIGHT > WINDOW_WIDTH) WINDOW_RATIO = WINDOW_WIDTH / WINDOW_HEIGHT;
  // we are allowing zoom out to 175% of AOI size
  // this 25% leeway should still allow enough time to preload the next zone while moving
  let zoom = WINDOW_WIDTH / WINDOW_RATIO / (ALLOW_UNLIMITED_ZOOM_OUT ? MAP_SIZE.width : AOI.width * 1.75);
  if (GameController.MAP === 'aarena') {
    // Never zoom out past "map fills the viewport" — otherwise Phaser clear color (#150628)
    // shows as a big purple slab (often mistaken for a MetaMask sidebar leftover).
    const fillZoom = MAP_SIZE.width > 0 ? WINDOW_WIDTH / MAP_SIZE.width : 0.25;
    zoom = Math.max(0.25, fillZoom);
  }

  if (ALLOW_UNLIMITED_ZOOM_OUT) MAX_ZOOM_OUT = 0.05;
  else MAX_ZOOM_OUT = Math.round(zoom * 64) / 64;

  if (scene && init) {
    scene.zoom = MAX_ZOOM_OUT || zoom;
  } else {
    // if (scene.zoom < MAX_ZOOM_OUT) setZoomLevel(MAX_ZOOM_OUT, 0);
  }
}

function updateZoomLevel(zoomLevel) {
  scene.zoom = zoomLevel;

  if (GlobalState.SETTINGS.state.fadeGrid || ALLOW_UNLIMITED_ZOOM_OUT) {
    Parcels.fadeOut(scene.zoom);
    // scene.grid?.setAlpha(Math.min(scene.zoom / 2, 0.75));

    // if (scene.zoom >= 0.8) {
    //   scene.grid?.setAlpha(0.4);
    // }
    if (scene?.stars && scene.starField) {
      scene.stars.setAlpha(scene.zoom * 3);
      scene.starField.setAlpha(scene.zoom * 4);
    }
  }
  // scene.cameras.main.setBackgroundColor('rgba(33, 0, 87, '+(1-scene.zoom/2)+')');
  scene.cameras.main.zoom = scene.zoom;
  // scene.cameras.main.zoomTo(scene.zoom, 100, 'Linear', false);
  // scene.stars.setScale(1 / scene.zoom);
  // scene.starField.setScale(1 / scene.zoom);
  GlobalState.PHASER.dispatch({
    type: 'UPDATE_ZOOM_SLIDER',
    zoom: (scene.zoom - MAX_ZOOM_OUT) / getDefaultZoomRange(),
  });

  checkZoom();
}

export const showStarfield = (enable: boolean) => {
  if (GlobalState.SETTINGS.state.allowStarField) {
    scene.stars.setVisible(enable);
    scene.starField.setVisible(enable);
  }
};

function updateCameraBounds() {
  const mapWidthDisplay = scene.zoom * MAP_SIZE.width;
  // Aarena: always clamp to the real map — expanding bounds past the tilemap shows purple void.
  if (GameController.MAP === 'aarena' || mapWidthDisplay >= WINDOW_WIDTH) {
    scene.cameras.main.setBounds(0, 0, MAP_SIZE.width, MAP_SIZE.height);
  } else {
    scene.cameras.main.setBounds(CAMERA_BOUNDS.left, 0, CAMERA_BOUNDS.right, MAP_SIZE.height);
  }
}

export function getDefaultMaxZoomOut(): number {
  return MAX_ZOOM_OUT;
}

export function getDefaultZoomRange(): number {
  return MAX_ZOOM_IN - MAX_ZOOM_OUT;
}

export function checkZoom(): void {
  updateCameraBounds();

  if (scene.zoom < DEFAULT_ZOOM && !scene.maxZoomOut) {
    scene.maxZoomOut = true;
    // showStarfield(scene, false);

    GlobalState.PHASER.dispatch({
      type: 'UPDATE_MAX_ZOOM_OUT',
      maxZoomOut: scene.maxZoomOut,
    });
  } else if (scene.zoom >= DEFAULT_ZOOM && scene.maxZoomOut) {
    scene.maxZoomOut = false;
    // showStarfield(scene, true);

    GlobalState.PHASER.dispatch({
      type: 'UPDATE_MAX_ZOOM_OUT',
      maxZoomOut: scene.maxZoomOut,
    });
  }
}

export function handleZoomSlider(zoom: number): void {
  // console.log('@handleZoomSlider:zoom', zoom);
  const zoomLevel = MAX_ZOOM_OUT + getDefaultZoomRange() * zoom;
  const dz = Math.abs(zoomLevel - scene.zoom);
  let zoomDuration = ZOOM_DURATION;

  if (dz > 0.1) zoomDuration *= dz * 5;
  setZoomLevel(zoomLevel, zoomDuration);
}

export function handleZoomClick(): void {
  if (!scene.maxZoomOut) {
    if (scene.zoom !== DEFAULT_ZOOM) scene.zoom = DEFAULT_ZOOM;
    else scene.zoom = MAX_ZOOM_OUT;
  } else scene.zoom = DEFAULT_ZOOM;

  checkZoom();
  if (GlobalState.SETTINGS.state.fadeGrid) Parcels.fadeOut(scene.zoom);
  scene.cameras.main.setZoom(scene.zoom);
}

let debugShapes = [];
export function createTestBodies(scene, data) {
  const color = new Phaser.Display.Color();
  if (data.rects) {
    const clearTestOverlay = data.rects && data.rects.length === 0;
    if (clearTestOverlay) {
      debugShapes.forEach(function (shape) {
        shape.destroy(true);
      });
      debugShapes = [];
    } else {
      if (data.rects) {
        data.rects.forEach(({ x, y, width, height }) => {
          color.random(100);
          const graphics = scene?.add?.graphics().setDepth(1000);
          graphics.name = 'debug_shape';
          graphics.fillStyle(color.color, 0.7);
          graphics.fillRect(x - width / 2, y - height / 2, width, height);
          debugShapes.push(graphics);
        });
      }
      if (data.verts) {
        data.verts.forEach((vert) => {
          createVertsPath(vert);
        });
      }
    }
  } else if (data.aoiRects) {
    debugShapes.forEach(function (shape) {
      shape.destroy(true);
    });
    debugShapes = [];
    data.aoiRects.forEach(({ x, y, width, height }) => {
      const graphics = scene.add.graphics().setDepth(1000);
      const aoiLineWidth = 32;
      graphics.name = 'debug_shape';
      graphics.lineStyle(aoiLineWidth, 0xffffff, 0.15);
      graphics.strokeRect(x + aoiLineWidth / 2, y + aoiLineWidth / 2, width - aoiLineWidth, height - aoiLineWidth);
      debugShapes.push(graphics);
    });
  }
}

// move the container child to the last order of depth
export function moveToLastOrder(id: string, child: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image): void {
  if (!scene[id]) return;
  const container: Phaser.GameObjects.Container = scene[id];
  if (container.exists(child)) {
    container.moveTo(child, scene[id].length - 1);
  } else {
    // console.log('@Phaser.Helper Child not Found');
  }
}

export function createVertsPath(data) {
  // console.log('data', data);
  const { vertSet, x, y, width, height } = data;
  // console.log(vertSet);
  const graphics = scene?.add?.graphics({ x, y });
  graphics.lineStyle(2, 0x00aa00);
  graphics.beginPath();
  graphics.setDepth(200);

  graphics.moveTo(vertSet[0].x - width / 2, vertSet[0].y - height / 2);

  for (let i = 1; i < vertSet.length; i++) {
    graphics.lineTo(vertSet[i].x - width / 2, vertSet[i].y - height / 2);
  }

  graphics.closePath();
  graphics.fillStyle(0x00ff00, 0.4);
  graphics.strokePath();
}

export const getOriginByDirection = ({ x, y }: Vector2): Vector2 => {
  return {
    x: x <= 0 ? (x < 0 ? 1 : 0.5) : 0,
    y: y <= 0 ? (y < 0 ? 1 : 0.5) : 0,
  };
};

export const getOffsetByDirection = (direction: Vector2, factor: number): Vector2 => {
  return direction ? { x: direction.x * factor, y: direction.y * factor } : { x: 0, y: 0 };
};

export function getDynamics(diff: number): 1 | 2 | 3 {
  if (diff >= 0 && diff <= 75) {
    return 1;
  } else if (diff >= 76 && diff <= 150) {
    return 2;
  } else if (diff >= 151) {
    return 3;
  }
}

export const getDirectionByVector360 = (vector: Vector2): string => {
  // 0,0 = idle
  if (vector === undefined) return null;
  if (vector === null) return null;

  if (vector.x === 0 && vector.y === 0) return 'idle';
  const angle = Math.atan2(vector.y, vector.x);
  const angleInDeg = Math.round((angle * 180) / Math.PI);
  if (angleInDeg < 45 && angleInDeg > -45) {
    return 'right';
  } else if (angleInDeg < -45 && angleInDeg > -135) {
    return 'up';
  } else if (angleInDeg > 45 && angleInDeg < 135) {
    return 'down';
  } else {
    return 'left';
  }
};

export interface TTLConfig {
  x: number;
  y: number;
  radius: number;
  borderThickness: number;
  bgColor: number;
  borderColor: number;
  indicatorColor: number;
  indicatorBorderColor: number;
  lifeSpan: number;
  currentTime: number;
}

export const createTTLIndicator = (config: TTLConfig): Phaser.GameObjects.Container => {
  // console.log("add ttl indicator");

  const { x, y, radius, borderThickness, bgColor, borderColor, indicatorColor, indicatorBorderColor, lifeSpan, currentTime } = config;
  const ttlContainer = scene.add.container(x, y).setName('indicator');
  ttlContainer.setDataEnabled();
  ttlContainer.setData('config', config);

  const graphics: Phaser.GameObjects.Graphics = scene.add.graphics().setName('graphics');

  graphics.clear();
  graphics.fillStyle(bgColor, 0.3);
  graphics.fillCircle(0, 0, radius);

  graphics.lineStyle(borderThickness, borderColor);
  graphics.strokeCircle(0, 0, radius);

  graphics.fillStyle(indicatorColor, 1);
  graphics.beginPath();
  const currentValue = (360 / lifeSpan) * currentTime;
  graphics.slice(0, 0, radius, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(-currentValue), true);
  graphics.fillPath();
  graphics.lineStyle(borderThickness, indicatorBorderColor);
  graphics.strokePath();
  graphics.closePath();
  // graphics.lineStyle(1, white);

  ttlContainer.add(graphics);
  return ttlContainer;
};

export const runDurationBasedTTL = (ttlContainer: Phaser.GameObjects.Container): void => {
  const graphics: Phaser.GameObjects.Graphics = ttlContainer.getByName('graphics') as Phaser.GameObjects.Graphics;
  const config = ttlContainer.getData('config');

  const { radius, bgColor, borderColor, borderThickness, indicatorColor, indicatorBorderColor, lifeSpan, currentTime } = config;
  const currentValue = (360 / lifeSpan) * currentTime;
  // console.log('updateTTLIndicator', currentValue, currentTime);
  const tween = scene.tweens.addCounter({
    from: 0,
    to: currentValue, // modify here
    duration: currentTime, // milliseconds
    onUpdate: function (tween) {
      graphics.clear();
      graphics.fillStyle(bgColor, 0.3);
      graphics.fillCircle(0, 0, radius);

      graphics.lineStyle(borderThickness, borderColor);
      graphics.strokeCircle(0, 0, radius);

      graphics.fillStyle(indicatorColor, 1);
      graphics.beginPath();
      graphics.slice(0, 0, radius, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(-currentValue + tween.getValue()), true);
      graphics.fillPath();
      graphics.lineStyle(borderThickness, indicatorBorderColor);
      graphics.strokePath();
      graphics.closePath();
      // console.log('graphics', -currentValue + tween.getValue());
    },
    onComplete: function () {
      // console.log('timer completed clear graphics');
      tween.stop();
    },
  });
};
