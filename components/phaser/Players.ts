/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
import SFXController from '../controllers/SFXController';
import GameController from 'components/controllers/GameController';
import InputController from 'components/controllers/inputController';
import Performance from 'components/utility/performance';
import FilterdWordList from 'components/controllers/FilteredWordList';
import { fetchAavegotchiURL, getOrFetchAavegotchiURL, isNaked, isTrueSpectator } from 'helpers/gotchi.helper';
import {
  getDefaultCameraSettings,
  setZoomLevel,
  setZoomDefaults,
  getGroupMemberById,
  getOffsetByDirection,
  getAngleByDirV2,
  toggleZooming,
  moveToLastOrder,
  getDirectionByVector360,
  showDamage,
} from 'helpers/phaser.helper';
import _ from 'lodash';
import {
  SelectedPlayer,
  Player,
  Vector2,
  MouseActiveData,
  CollisionEvent,
  Damage,
  PositionEvent,
  Direction,
  PlayerDataIdName,
  InteractionEvent,
  RemovingPlayer,
  Health,
  FocusEventData,
} from 'types';
// import Melee from './Melee';
// import Missiles from './Missiles';
import AnimationsController from 'components/controllers/animationsController';
import { updateGlobalPlayerPos } from 'contexts/PhaserContext/actions';
import Installations from './Installations';
import { scene } from 'components/controllers/SceneController';
import MapController from '../controllers/MapController';
import GlobalState from 'contexts/GlobalState';
import Router from 'next/router';
import Quests from './Quests';
import Enemies from './Enemies';

let selectedPlayer: SelectedPlayer;
let ChatBubblePhaser;
let mouseUpdateInterval: NodeJS.Timeout;
let cameraSettings;
let isSpectator: boolean;
let HealthBar;
export const observerColors = ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'yellow'];

export interface PlayersObj {
  currentParcel: string;
  init: () => void;
  initPlayer: (player: SelectedPlayer) => void;
  addPlayers: (players: Player[]) => Promise<void>;
  removePlayers: (players: RemovingPlayer[]) => void;
  updatePlayerPosition: (selfPosition: PositionEvent) => void;
  updateServerDirection: (direction: Direction, sprint?: boolean) => void;
  updateHealth: (data: Damage) => void;
  handleDamage: (data: Damage) => void;
  handleCollisions: (data: CollisionEvent) => void;
  handlePositions: (data: PositionEvent[]) => void;
  handleClickToMove: (pointer: Phaser.Input.Pointer) => void;
  isSelectedPlayer: (id: string) => boolean;
  getPlayerData: () => SelectedPlayer;
  getPlayerDataIdName: () => PlayerDataIdName;
  toggleHealthBar: (id: string, state: boolean, health: number) => void;
  handlePlayerDeath: (id: string) => void;
  handleEmoteEvent: (data: InteractionEvent) => void;
  displayChatBubble: (data) => void;
  updateFocusTransparency: (data: FocusEventData) => void;
  updatePlayerHealth: (id: string, health: number) => void;
  handleRoadSound: (isMoving: boolean) => void;
  handleStartSpin: (data: InteractionEvent) => void;
  handleStopSpin: (data: InteractionEvent) => void;
  setDeadState: (id: string, state: boolean) => void;
  playerCanMove: boolean;
  isSpectator: boolean;
  groundType: string;
  alchemicaType: string;
  toggleVisible: (playerId: string, state: boolean) => void;
  soundFadingTween: Phaser.Tweens.Tween;
  mouseUpdateInterval: NodeJS.Timeout;
  selectedPlayer: SelectedPlayer;
  onPlayerSocketInit: (player: Player) => void;
  handleRespawn: (id: string, duration?: number) => void;
  checkInvisible: (id: string, source: 'sprint' | 'shoot') => void;
}

const init = (): void => {
  HealthBar = require('components/phaser/HealthBar').default;
  ChatBubblePhaser = require('components/phaser/ChatBubblePhaser').default;
  InputController.init();
};

function initPlayer(player: SelectedPlayer): void {
  Players.selectedPlayer = player;
  selectedPlayer = player;
}

function applyGotchiTexture(id: string, textureKey: string): void {
  if (!scene?.[id]) return;
  const spr = scene[id].getByName?.('gotchi_sprite');
  if (!spr || !textureKey) return;
  if (!scene.textures.exists(textureKey) || scene.textures.get(textureKey)?.key === '__MISSING') return;
  try {
    const frame = spr.frame?.name ?? 0;
    spr.setTexture(textureKey, frame);
    spr.setDisplaySize(64, 64);
    spr.setVisible(true);
    spr.setAlpha(1);
  } catch (e) {
    console.warn('@applyGotchiTexture', id, textureKey, e);
  }
}

function isGotchiTextureOk(key: string): boolean {
  if (!scene?.textures?.exists(key)) return false;
  const tex = scene.textures.get(key);
  if (!tex || tex.key === '__MISSING') return false;
  return Number(tex.frameTotal ?? 0) >= 4;
}

function isSelectedPlayer(id: string): boolean {
  if (!selectedPlayer) return false;
  // Soft-mint ids (`starter-wbtc-1`) are non-numeric — Number() → NaN and never matches.
  if (selectedPlayer.isSpectator || !Number.isFinite(Number(id)) || !Number.isFinite(Number(selectedPlayer.id))) {
    return String(id) === String(selectedPlayer.id);
  }
  return Number(id) === Number(selectedPlayer.id);
}

async function addPlayers(players: Player[]): Promise<void> {
  if (!scene || !scene.textures || !Array.isArray(scene.playersToLoad)) {
    console.warn('@addPlayers: Phaser scene not ready');
    return;
  }
  await Promise.all(
    players.map(async (player) => {
      if (!scene || !scene.textures) return;
      const nakeyId = /^0x[a-fA-F0-9]{40}$/i.test(String(player.id || ''));
      // Colyseus payloads historically omitted isSpectator — treat wallet-address ids as Nakey.
      if (nakeyId && GlobalState.GAME.state.gameConfig.enableNakedGotchis) {
        player = { ...player, isSpectator: true, name: player.name || 'Nakey Gotchi' };
      }

      if (isNaked(player.isSpectator)) {
        displayPlayer(player);
        return;
      }

      const textureOk = isGotchiTextureOk(player.id);

      if (textureOk || scene.loadedPlayerIds?.includes(player.id)) {
        // player is already loaded, just apply properties
        if (textureOk) applyGotchiTexture(player.id, player.id);
        displayPlayer(player);
      } else {
        if (scene.textures.exists(player.id) && !textureOk) {
          try {
            scene.textures.remove(player.id);
          } catch {
            /* ignore */
          }
        }
        const playerAlreadyLoadingObj = _.find(scene.playersToLoad, ['id', player.id]);
        if (playerAlreadyLoadingObj) {
          // player is already loading from a previous request, piggy back on it
          Object.assign(playerAlreadyLoadingObj, player);
        } else {
          // player asset is not already loaded, nor is it loading, so we load from scratch
          scene.playersToLoad.push(player);
          if (!isTrueSpectator(player.isSpectator)) {
            await getOrFetchAavegotchiURL(player.id, (texture) => {
              if (!scene || !scene.textures) return;
              const key = texture?.key && texture.key !== '__MISSING' ? texture.key : player.id;
              applyGotchiTexture(player.id, key);
              displayExistingPlayerWithId(player.id);
            });
          } else {
            // display loaded spectator after load
            displayExistingPlayerWithId(player.id);
          }
        }
      }
    }),
  );
}

const displayExistingPlayerWithId = (id: string): void => {
  const existingLoadingPlayer = _.find(scene.playersToLoad, ['id', id]);
  if (existingLoadingPlayer) displayPlayer(existingLoadingPlayer);
  else console.log('existing player with id', id, 'not found');
};

// create a player or update an existing one with new state
const displayPlayer = (player: Player): void => {
  if (!scene || !scene.add || !scene.textures) {
    console.warn('@displayPlayer: Phaser scene not ready', player?.id);
    return;
  }
  const { x, y, name, id, health, maxHealth, isSpectator, isLent, isShadowBanned, isDead, isFocused, created, spectatorColor } = player;
  if (isSpectator && selectedPlayer && id === selectedPlayer.id) {
    selectedPlayer.spectatorColor = spectatorColor;
    selectedPlayer.name = name;
  }

  let playerSprite, observerEye, observerContainer;

  if (!Array.isArray(scene.loadedPlayerIds)) scene.loadedPlayerIds = [];
  if (!Array.isArray(scene.playersToLoad)) scene.playersToLoad = [];
  _.remove(scene.loadedPlayerIds, (loadedId) => loadedId === id);
  scene.loadedPlayerIds.push(id);
  _.remove(scene.playersToLoad, (playerObj) => playerObj.id === id);

  const healthbarActive = Boolean(scene.mapConfig?.SHOOT_MODE);
  const alreadyAddedToScene = Boolean(scene[id]);
  if (!alreadyAddedToScene) {
    scene[id] = scene.add.container(x, y);
    scene[`${id}_bottom`] = scene.add.container(x, y);
    scene[`${id}_top`] = scene.add.container(x, y);
    scene[id].setSize(64, 64);
    scene[`${id}_top`].setSize(64, 64);
    scene[`${id}_bottom`].setSize(64, 64);
    scene[id].movementOrientation = 0; // Facing down
    scene[id].health = health ?? 1000;
    scene[id].maxHealth = maxHealth || 1000;

    // setup sprite — start visible. Spawn VFX overlays; never leave the body stuck hidden
    // if reveal/anim fails (citaadel Colyseus used to keep gotchi_sprite invisible forever).
    if (!isTrueSpectator(isSpectator)) {
      const preferredKey = isNaked(isSpectator) ? 'defaultGotchi' : id;
      const texOk = isGotchiTextureOk(preferredKey);
      const fallbackOk = isGotchiTextureOk('defaultGotchi');
      // Prefer a real body texture — blank PNG sheets can pass frameTotal and still paint nothing.
      const textureKey = texOk ? preferredKey : fallbackOk ? 'defaultGotchi' : preferredKey;
      playerSprite = scene.add
        .sprite(0, 0, textureKey, 0)
        .setName('gotchi_sprite')
        .setVisible(true)
        .setAlpha(1);
      playerSprite.displayWidth = 64;
      playerSprite.displayHeight = 64;
      playerSprite.setDataEnabled();
    } else {
      // observer image
      observerContainer = scene.add.container(0, 0).setName('spectator');
      playerSprite = scene.add.sprite(0, 0, 'observer_body', spectatorColor * 7).setName('spectator_body');
      playerSprite.setDisplaySize(30, 32);
      observerEye = scene.add
        .sprite(0, -3, 'observer_iris', spectatorColor * 7)
        .setName('spectator_eye')
        .setDisplaySize(6, 4);
      observerContainer.add(playerSprite);
      observerContainer.add(observerEye);
    }

    const shadow = scene.add.image(0, 7, 'gotchi_shadow').setDepth(2);
    shadow.setOrigin(0.5);

    // set this filter mod NEAREST if pixelArt is disabled, to have the same effect on a sprite level
    // playerSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    let filteredName;
    if (name) {
      filteredName = FilterdWordList.filterStrMemorized(name);
    }
    const playerName = scene.add
      .text(0, -60, filteredName || `<NO NAME> #${id}`, {
        fontFamily: 'Pixelar',
        fontSize: '22px',
      })
      .setName('playerName')
      .setOrigin(0.5);
    if (isTrueSpectator(isSpectator)) {
      playerName.setPosition(0, -40);
      shadow.setDisplaySize(30, 32);
    }
    const strokeColor = isShadowBanned || isLent ? '#000000' : '#C82AC2';

    if (isNaked(isSpectator)) {
      playerName.setPosition(0, -60);
      playerName.setColor('#70FFDD');
      playerName.setStroke('#70FFDD', 0.2);
    } else {
      if (isSelectedPlayer(id)) {
        playerName.setStroke('#000000', 4);
        playerName.setColor('#fb82e6');
      } else {
        playerName.setStroke(strokeColor, 4);
        playerName.setShadow(2, 2, '#333333', 0, true, false);
      }
    }

    const bubblesContainer = scene.add.container(0, -95);
    scene[`${id}_top`].add(bubblesContainer);
    scene[`${id}_top`].bubblesContainer = bubblesContainer;

    if (!isTrueSpectator(isSpectator)) {
      scene[id].add(playerSprite);
    } else {
      scene[id].add(observerContainer);
    }
    scene[`${id}_top`].add(playerName);
    scene[`${id}_bottom`].add(shadow);

    scene[id].setDepth(200);
    scene[`${id}_top`].setDepth(300);
    scene[`${id}_bottom`].setDepth(20);
  } else {
    updatePlayerPosition({ id, x, y, noTween: true });
    // Repair Nakey sprites that were first added without isSpectator (missing 0x texture).
    if (isNaked(isSpectator)) {
      const spr = scene[id]?.getByName?.('gotchi_sprite');
      if (spr && scene.textures.exists('defaultGotchi') && spr.texture?.key !== 'defaultGotchi') {
        spr.setTexture('defaultGotchi', 0);
        spr.setDisplaySize(64, 64);
        spr.setVisible(true);
      }
    }
    // Soft-mint: swap blank/missing body for a good sheet when it arrives after first paint.
    if (!isTrueSpectator(isSpectator)) {
      if (isGotchiTextureOk(id)) applyGotchiTexture(id, id);
      else if (isGotchiTextureOk('defaultGotchi')) applyGotchiTexture(id, 'defaultGotchi');
      forceRevealPlayer(id);
    }
  }
  if (healthbarActive && !isTrueSpectator(isSpectator)) toggleHealthBar(id, true, health);

  if (isSelectedPlayer(id)) {
    scene[id].setDepth(201);
    scene[`${id}_top`].setDepth(301);
    // update position in the minimap
    scene[id].isOnRoad = false;
  }

  if (!alreadyAddedToScene && GlobalState.SETTINGS.state.allowGotchiGlow && !isTrueSpectator(isSpectator)) {
    handleGlow(player);
  }

  if (!alreadyAddedToScene && GlobalState.SETTINGS.state.allowPlayerAnimation) {
    if (isTrueSpectator(isSpectator)) {
      AnimationsController.play(playerSprite, `${observerColors[spectatorColor]}_observer_body`);
      AnimationsController.play(observerEye, `${observerColors[spectatorColor]}_observer_iris`);
      scene.tweens.add({
        targets: [observerContainer],
        y: { from: playerSprite.y - 6, to: playerSprite.y },
        duration: 500,
        ease: Phaser.Math.Easing.Sine.InOut,
        yoyo: true,
        repeat: -1,
      });
    } else {
      scene.tweens.add({
        targets: playerSprite,
        y: { from: playerSprite.y - 12, to: playerSprite.y },
        duration: 1000,
        ease: Phaser.Math.Easing.Sine.InOut,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  setDeadState(id, Boolean(isDead));

  // Only play spawn VFX on first create — Colyseus re-calls displayPlayer often; re-running
  // handleRespawn every time left sprites half-alpha / re-hidden under failed anims.
  const shouldSpawnFx =
    !isDead && !alreadyAddedToScene && (created || process.env.NEXT_PUBLIC_NETCODE === 'colyseus');
  if (shouldSpawnFx) {
    handleRespawn(id);
  } else if (!isDead) {
    toggleVisible(id, true);
  }
  // Belt-and-suspenders: living local/remote gotchis must stay visible after display.
  if (!isDead) {
    forceRevealPlayer(id);
    scene.time?.delayedCall?.(250, () => forceRevealPlayer(id));
  }
  updateFocusTransparency({ id, state: isFocused });
};

function handleGracePeriod(id: string) {
  if (!scene[id] || !scene[`${id}_top`]) return;
  // Colyseus combat MVP has no damage yet — skip spawn lock so attacks work immediately.
  if (process.env.NEXT_PUBLIC_NETCODE === 'colyseus') {
    scene[id].isGracePeriod = false;
    return;
  }
  scene[id].isGracePeriod = !!GlobalState.GAME.state.gameConfig.fireDisabledDuration;

  if (scene[id].isGracePeriod) {
    // todo: server also checks for takingDamageDisabledDuration, so if they are ever different
    // we will have an issue here
    const gracePeriodSeconds = GlobalState.GAME.state.gameConfig.fireDisabledDuration;
    const onComplete = () => {
      if (scene[id]) {
        scene[id].alpha = 1;
        scene[`${id}_top`].alpha = 1;
        scene[id].isGracePeriod = false;
      }
    };
    const timeline = scene.tweens.timeline({
      tweens: [
        {
          targets: [scene[`${id}_top`], scene[id]],
          alpha: 0.35,
          ease: Phaser.Math.Easing.Sine.Out,
          duration: 500,
          repeat: 4,
          yoyo: true,
        },
        {
          targets: [scene[`${id}_top`], scene[id]],
          alpha: 0.35,
          ease: Phaser.Math.Easing.Sine.Out,
          duration: 250,
          repeat: 2,
          yoyo: true,
        },
      ],
      onComplete,
    });

    setTimeout(() => {
      // if we hit the end of grace period, stop the animations
      if (timeline?.isPlaying()) {
        timeline.stop();
        onComplete();
      }
    }, gracePeriodSeconds * 1000);
  }
}

function updatePlayerHealth(id: string, health: number): void {
  scene[id].health = health;
}

/** Force containers + body sprite visible (bypass fragile reveal races). */
function forceRevealPlayer(id: string): void {
  if (!scene?.[id] || scene[id].isDead) return;
  if (!scene.loadedPlayerIds.includes(id)) scene.loadedPlayerIds.push(id);
  try {
    scene[id].setVisible(true);
    scene[id].getByName('gotchi_sprite')?.setVisible(true);
    scene[id].getByName('spectator')?.setVisible(true);
    scene[`${id}_top`]?.setVisible(true);
    scene[`${id}_bottom`]?.setVisible(true);
  } catch {
    /* ignore */
  }
}

function gotchiSpawnAnim(id) {
  if (!scene[id]) return;

  // Body stays visible under the VFX — never hide it waiting for anim callbacks.
  const reveal = () => forceRevealPlayer(id);
  reveal();

  const safety = scene.time?.delayedCall?.(500, reveal);

  if (!scene.textures.exists('gotchi_spawn')) {
    return;
  }

  // Drop any prior spawn VFX (re-entrant displayPlayer / reconnect).
  try {
    scene[id].getByName('spawnAnim')?.destroy?.();
  } catch {
    /* ignore */
  }

  const spawnImage = scene.add.sprite(0, -38, 'gotchi_spawn', 0).setName('spawnAnim');
  scene[id].add(spawnImage);
  spawnImage.setVisible(true);
  AnimationsController.play(spawnImage, 'gotchi_spawn');
  spawnImage.on(
    'animationcomplete',
    () => {
      safety?.remove?.(false);
      reveal();
      try {
        spawnImage.destroy();
      } catch {
        /* ignore */
      }
    },
    this,
  );
}

const toggleHealthBar = (id: string, state: boolean, health: number): void => {
  if (!scene || !scene[`${id}_top`]) return;
  let healthBar = scene[`${id}_top`]?.getByName('health');
  if (state) {
    const maxHealth = scene[id]?.maxHealth || 1000;
    if (!healthBar) {
      try {
        healthBar = new HealthBar(-16, -45, isSelectedPlayer(id) ? 'player' : 'friends', maxHealth).setName('health');
        scene[`${id}_top`].add(healthBar);
      } catch (e) {
        console.warn('@toggleHealthBar: scene not ready', e);
        return;
      }
    }
    const nextHealth = Number.isFinite(Number(health)) ? Number(health) : maxHealth;
    updateHealth({ id, health: nextHealth, maxHealth } as Health);
  } else {
    if (healthBar) healthBar.destroy();
  }
};

// function loadPlayerWearables(playerUrl, player) {
//   const svgConfig = {
//     width: 32,
//     height: 32,
//   };

//   //* will use wearbleid directly to load them
//   if (playerUrl.leftHand !== undefined) {
//     if (!scene.textures.exists(player.leftHand.id)) {
//       console.log('left hand LOADED ', player.leftHand.id);
//       scene.load.svg(player.leftHand.id, playerUrl.leftHand, svgConfig);
//     }
//   }
//   if (playerUrl.rightHand !== undefined) {
//     if (!scene.textures.exists(player.rightHand.id)) {
//       console.log('right hand LOADED ', player.rightHand.id);
//       scene.load.svg(player.rightHand.id, playerUrl.rightHand, svgConfig);
//     }
//   }
// }

function getPlayerData(): SelectedPlayer {
  return {
    authToken: selectedPlayer.authToken,
    id: selectedPlayer.id,
    isSpectator: selectedPlayer.isSpectator,
    name: selectedPlayer.name,
    network: selectedPlayer.network,
    owner: selectedPlayer.owner,
    collateralColor: selectedPlayer.collateralColor,
    level: selectedPlayer.level,
    // leftHand: selectedPlayer.leftHand,
    // rightHand: selectedPlayer.rightHand,
  };
}
function getPlayerDataIdName(): PlayerDataIdName {
  return {
    id: selectedPlayer.id,
    name: selectedPlayer.name,
  };
}

// triggered on mouse click up
// We send an initial down click to the socket with the target destination in mind

function handleClickToMove(pointer: Phaser.Input.Pointer): void {
  // clear any existing mouse interval
  clearInterval(mouseUpdateInterval);
  if (!playerSocketInited || !scene || scene.activeRealmId) {
    // don't register mouse / key event changes until game and socket are inited
    return;
  }
  let lastUpdatedPosition;
  let lastUpdateSprint;
  // let cameraPosition;
  if (pointer.isDown) {
    mouseMove(pointer);
    mouseUpdateInterval = setInterval(() => {
      mouseMove(pointer);
    }, 200);
  } else {
    const data: MouseActiveData = { active: pointer.isDown };
    GameController.sendData('movement', 'mouse', data);
  }

  function mouseMove(pointer: Phaser.Input.Pointer) {
    if (!playerSocketInited) {
      clearInterval(mouseUpdateInterval);
      // don't register mouse / key event changes until inited
      return;
    }
    const position = { x: Math.round(pointer.worldX), y: Math.round(pointer.worldY) };

    // cameraPosition = { x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY };
    // console.log((!lastUpdatedPosition || lastUpdatedPosition.x !== position.x || lastUpdatedPosition.y !== position.y));
    const isSprint = InputController.isSprinting() && !isTrueSpectator(selectedPlayer.isSpectator);
    if (!lastUpdatedPosition || lastUpdatedPosition.x !== position.x || lastUpdatedPosition.y !== position.y || lastUpdateSprint !== isSprint) {
      if (Players.playerCanMove) {
        // console.log('mousePosition', position);
        lastUpdatedPosition = position;
        lastUpdateSprint = isSprint;
        const data: MouseActiveData = { position, active: pointer.isDown, sprint: isSprint };
        GameController.sendData('movement', 'mouse', data);
        Performance.start('positions');
      } else {
        if (position.x > 64 / 2 && position.y > 64 / 2) Players.playerCanMove = true;
      }
    }
  }
}

// this gets triggered on realm socket connection-success event
// the player can start moving after this event.
// note: this event gets triggered on reconnect from disconnect so we only
// run some of the initialiation logic, animation, sound the first time
// if the player already exists it means it's a reconnect
let playerSocketInited = false;

async function onPlayerSocketInit(player: Player): Promise<void> {
  // if player is a spectator the player.id is generated as the randomly generated observooor name returned here
  if (player.isSpectator) {
    Players.selectedPlayer.id = player.id;
    selectedPlayer.id = player.id;
  }

  playerSocketInited = true;
  if (scene.loadedPlayerIds.includes(player.id)) return;

  await Players.addPlayers([player]);
  _.delay(async () => {
    await MapController.initMap();
    Quests.toggleHint(GlobalState.GAME.state.gameConfig.enableQuestHint);
    cameraSettings = getDefaultCameraSettings();
    // Use map width/height — left/right were CAMERA_BOUNDS fields misused as setBounds width,
    // which left empty purple letterboxing on wide viewports / after MetaMask sidebar resize.
    scene.cameras.main
      .setZoom(cameraSettings.zoom)
      .setBounds(0, 0, cameraSettings.width, cameraSettings.height);
    if (!scene[player.id]) return;
    scene.cameras.main.startFollow(scene[player.id], true);
    SFXController.fadeIn('gotchi_spawn');

    // animate zoom into the player
    setZoomDefaults(true);
    setZoomLevel(0.55, 2000);
    toggleZooming(true);
    registerGotchiSpinHandle();
  }, 10);
}

function setupSpinAnimation(id: string, sprite: Phaser.GameObjects.Sprite) {
  const currentOrientation = Number(sprite.frame.name);
  let animFrames;
  switch (currentOrientation) {
    case 0: // Down
      animFrames = [1, 3, 2, 0];
      break;
    case 1: // Left
      animFrames = [3, 2, 0, 1];
      break;
    case 2: // Right
      animFrames = [0, 1, 3, 2];
      break;
    case 3: // Up
      animFrames = [2, 0, 1, 3];
      break;
  }

  const frameDuration = GlobalState.GAME.state.gameConfig.spinDuration / 4;
  const animationKey = id + '_spin_' + currentOrientation;
  scene.anims.create({
    // If the key already exists, Phaser will reuse it
    key: animationKey,
    defaultTextureKey: sprite.texture.key,
    frames: [
      { frame: animFrames[0], duration: frameDuration },
      { frame: animFrames[1], duration: frameDuration },
      { frame: animFrames[2], duration: frameDuration },
      { frame: animFrames[3], duration: frameDuration },
    ],
    repeat: -1,
  });

  return animationKey;
}

function registerGotchiSpinHandle() {
  const player = scene[selectedPlayer.id];
  if (isTrueSpectator(selectedPlayer.isSpectator)) return;
  scene.actionKeys.spinKey.on('down', () => {
    if (scene.disableKeyboard) return;
    const orientation = player?.getByName('gotchi_sprite').frame.name || 0;
    GameController.sendData('interaction', 'spinStart', { label: orientation });
  });

  scene.actionKeys.spinKey.on('up', () => {
    if (scene.disableKeyboard) return;
    const orientation = player?.getByName('gotchi_sprite').frame.name || 0;
    GameController.sendData('interaction', 'spinStop', { label: orientation });
  });
}

function handleStartSpin({ id, label }: InteractionEvent): void {
  const orientation = Number(label) || 0;
  const sprite = scene[id]?.getByName('gotchi_sprite');
  if (!sprite) return;

  sprite.setFrame(orientation);
  const animationKey = setupSpinAnimation(id, sprite);
  sprite.play(animationKey);
}

function handleStopSpin({ id, label }: InteractionEvent): void {
  const orientation = Number(label) || 0;
  const player = scene[id].getByName('gotchi_sprite');
  if (player?.anims?.currentAnim?.key) {
    player.stop(player.anims.currentAnim.key);
    player.setFrame(orientation);
  }
}

function handleEmoteEvent({ id, label }: InteractionEvent): void {
  if (!playerSocketInited) {
    // don't register mouse / key event changes until inited
    return;
  }
  if (scene[id]?.getByName('chat')) {
    const pastChat = scene[id].getByName('chat');
    pastChat.destroy();
  }
  if (scene[id]) {
    const chat = scene.add.sprite(-40, 0, 'chat', 0).setOrigin(0.5).setName('chat');
    scene[id].add(chat);
    chat.on('animationcomplete', () => chat.destroy());
    AnimationsController.play(chat, label);
  }
}

function removePlayers(players: RemovingPlayer[]): void {
  // console.log('removePlayers', players);
  // if players is an empty array, it means clear all players that are not the main player
  if (players.length === 0) {
    players = scene.loadedPlayerIds
      .filter((id) => id !== selectedPlayer.id)
      .map((id) => {
        return { id: id, destroyed: true };
      });
  }
  players.forEach((player) => {
    // we have to make an additional check here because the player may not have fully loaded before being removed
    _.remove(scene.playersToLoad, (playerObj) => playerObj.id === player.id);
    if (scene[player.id]) {
      // if player is being removed because they are permanently destroyed (like disconnecting from game) player.destroyed is true
      // in this case we free up the memory
      if (player.destroyed) {
        scene[player.id].destroy(true);
        scene[`${player.id}_bottom`].destroy(true);
        scene[`${player.id}_top`].destroy(true);
        scene[player.id].chargedContainer?.destroy(true);
        // critical step
        scene[player.id] = null;

        _.remove(scene.loadedPlayerIds, (id) => id === player.id);
        // console.log('removed', player.id, scene.playersToLoad, scene.loadedPlayerIds.length);
      } else {
        // otherwise we just hide the player asset so it can quickly be initialized again without network calls
        toggleVisible(player.id, false);
      }
    }
  });
}

const toggleVisible = (playerId: string, isVisible: boolean): void => {
  if (!scene[playerId]) return;
  // Keep registry in sync — Colyseus onRemove used to destroy containers without
  // clearing loadedPlayerIds, which made later reveals no-op.
  if (isVisible && !scene.loadedPlayerIds.includes(playerId)) {
    scene.loadedPlayerIds.push(playerId);
  } else if (!isVisible && !scene.loadedPlayerIds.includes(playerId)) {
    return;
  }
  scene[playerId].setVisible(isVisible);
  scene[playerId].getByName('gotchi_sprite')?.setVisible(isVisible);
  scene[playerId].getByName('spectator')?.setVisible(isVisible);
  scene[`${playerId}_top`]?.setVisible(isVisible);
  scene[`${playerId}_bottom`]?.setVisible(isVisible);
  if (!isVisible) {
    // disable any sprinting states
    disableSprint(playerId);
    // destroy charge container
    scene[playerId].chargedContainer?.destroy(true);
  }
};

// this option will attempt to smooth out irratic network latency during player movement tweens, it needs more testing
// right now it will incorrectly factor intentional gameplay pauses and intentional short bursts of key presses in delay calculations
const averageMovementTweens = false;
let knownDelay = 0;
let recentTimings = [];
let lastPlayerPositionUpdateTime = 0;
const average = (array) => array.reduce((a, b) => a + b) / array.length;

function updatePlayerPosition(playerPosition: PositionEvent): void {
  const { id, x, y, direction, isSprinting, noTween } = playerPosition;
  if (averageMovementTweens) {
    const now = Date.now();
    if (lastPlayerPositionUpdateTime) {
      const timeSinceLastUpdate = now - lastPlayerPositionUpdateTime;
      // if more than half second passes without position updates clear the position update averaging cache
      if (timeSinceLastUpdate > 500) {
        recentTimings = [];
        knownDelay = 0;
      }
      // log the last 30 valid movement packet timings that are within a realistic range and use that as tween position if it is greater than default FPS based
      if (
        timeSinceLastUpdate >= GlobalState.GAME.state.gameConfig.gameUpdateIntervalMS &&
        timeSinceLastUpdate <= GlobalState.GAME.state.gameConfig.gameUpdateIntervalMS * 5
      ) {
        recentTimings.push(timeSinceLastUpdate);
        if (recentTimings.length > 30) {
          // drop the oldest timing
          recentTimings.shift();
        }
        knownDelay = average(recentTimings);
      }
    }
    lastPlayerPositionUpdateTime = now;
  }

  // we have to ensure that the scene player is loaded or we could get a side view error
  if (scene[playerPosition.id] && (scene[id].getByName('gotchi_sprite') || scene[id].getByName('spectator'))) {
    // console.log('sideview ', direction);
    if (direction) {
      const orientation = handleSideView(id, direction);
      scene[id].movementOrientation = orientation;
    }
    if (_.has(playerPosition, 'isSprinting')) handleSprint(id, isSprinting, direction);
    if (_.has(playerPosition, 'direction') && GlobalState.SETTINGS.state.allowPlayerAnimation && direction) updateSprintFX(id, direction);
    if (!x || !y) return;

    const playerX = scene[playerPosition.id].x;
    const playerY = scene[playerPosition.id].y;
    const xDelta = Math.abs(playerX - x);
    const yDelta = Math.abs(playerY - y);

    let duration = GlobalState.GAME.state.gameConfig.gameUpdateIntervalMS; // assumes 15 FPS by default

    if (averageMovementTweens && knownDelay > duration) {
      duration = knownDelay;
    }

    // teleport gotchi instead of tweening position move if position difference is not close by
    // factor speed gain during road movement
    // this is particuarly important for respawn
    const teleport = noTween || xDelta > 500 || yDelta > 500;
    if (teleport) {
      // console.log('teleport');
      scene[id].x = x;
      scene[id].y = y;
      scene[`${id}_top`].x = x;
      scene[`${id}_top`].y = y;
      scene[`${id}_bottom`].x = x;
      scene[`${id}_bottom`].y = y;

      if (scene[id].chargedContainer) {
        scene[id].chargedContainer.x = x;
        scene[id].chargedContainer.y = y;
      }
    } else {
      // console.log('tween');
      scene.tweens.add({
        targets: [scene[id], scene[`${id}_top`], scene[`${id}_bottom`], scene[id].chargedContainer],
        y: y,
        x: x,
        duration,
      });
    }
    if (isSelectedPlayer(playerPosition.id)) {
      if (GameController.MAP !== 'aarena') MapController.updateMapEvent();

      SFXController.updateSpatialFX();
      if (scene.activeRealmId) {
        void Installations.setActiveInstallation();
      }
      // Soft-launch Store: show E prompt when standing near a Store exterior.
      Installations.updateNearbyStorePrompt?.();
      // update mini-map position
      if (!x || !y) return;
      updateGlobalPlayerPos({ x, y });
      if (scene.minimapGotchi) {
        if (teleport) {
          scene.minimapGotchi.x = x;
          scene.minimapGotchi.y = y;
        } else {
          scene.tweens.add({
            targets: [scene.minimapGotchi],
            y: y,
            x: x,
            duration,
          });
        }
      }
    }
    // checkCollisionZones(playerPosition);
  }
}

// Invisible Check, since no dead or invisible gotchi should be able to sprint or shoot we can check isDead or visibility here to see if it was invisible
const checkInvisible = (id: string, source: 'sprint' | 'shoot'): void => {
  const sprite = scene?.[id];
  if (!sprite) return;
  const body = sprite.getByName?.('gotchi_sprite') || sprite.getByName?.('spectator');
  const bodyHidden = body && body.visible === false;
  if (((sprite.isDead || !sprite.visible) && sprite.health) || (bodyHidden && sprite.health && !sprite.isDead)) {
    console.warn(`Invisible gotchi found on source ${source}: ${id}, reset visibility.`);
    setDeadState(id, false);
    forceRevealPlayer(id);
  }
};

function handleSprint(id: string, isSprinting: boolean, direction?: Vector2) {
  if (!direction || !scene[id]) return;
  let sprintSprite = null;
  let sprintPoof = null;
  const offset = getOffsetByDirection(direction, 10);
  const angle = getAngleByDirV2(direction);
  const allowAnimation = GlobalState.SETTINGS.state.allowPlayerAnimation;
  if (isSprinting) {
    checkInvisible(id, 'sprint');
    if (scene[id].getByName('sprint') === null && allowAnimation) {
      sprintSprite = scene.add
        .sprite(0, -155 * direction.y, 'sprint')
        .setName('sprint')
        .setOrigin(0.5);
      sprintSprite.setAngle(angle);

      // poof sprint
      sprintPoof = scene.add
        .sprite(scene[id].x, scene[id].y + offset.y * direction.y, 'spri_muz')
        .setOrigin(0.5)
        .setScale(2);
      sprintPoof.setAngle(angle - 90);
      sprintPoof.setDepth(301);
      if (isSelectedPlayer(id)) SFXController.playFX('spri_muz');
      AnimationsController.play(sprintPoof, 'spri_muz');
      AnimationsController.play(sprintSprite, 'sprint');
      scene[id].add(sprintSprite);
    }
    // current player
    if (isSelectedPlayer(id)) {
      SFXController.fadeIn('sprint_intro');
      SFXController.soundLoopPlay('sprint_loop');
    } else {
      // sprinting and not current player
      // SFXController.setSpatialAudios({ id: id, key: 'sprint_loop', container: scene[id] }, true);
    }
    // update with movement
  } else {
    disableSprint(id);
  }
}

function disableSprint(id) {
  const isSelectedPlayer = Players.isSelectedPlayer(id);
  if (isSelectedPlayer && isTrueSpectator(selectedPlayer.isSpectator)) return;
  if (scene[id]?.getByName('sprint')) {
    scene[id].getByName('sprint').destroy();
  }
  if (isSelectedPlayer) {
    SFXController.fadeOut('sprint_outro');
    SFXController.soundLoopStop('sprint_loop');
  }
}

function updateSprintFX(id, direction: Vector2) {
  if (!direction || !scene[id]) return;
  const sprint = scene[id].getByName('sprint');
  const angle = getAngleByDirV2(direction);
  if (sprint) {
    sprint.setAngle(angle);
    sprint.setFlipX(true);
    sprint.setPosition(-135 * direction.x, -155 * direction.y);
  }
}
const handleHitAnim = (data: CollisionEvent): void => {
  // console.log('handleHitAnim', data);
  const player = scene[data.playerHit.id];
  if (!player) return;

  let hitObjectType;
  if (data.playerHit.collisionObjectId) {
    const hitObjectId = data.playerHit.collisionObjectId;
    const [creatorId] = hitObjectId.split('#');
    hitObjectType = creatorId.split('-')[0];
  }

  const direction: Vector2 = data.playerHit?.direction;
  if (!direction) return;
  // flip direction
  direction.x = -direction.x;
  direction.y = -direction.y;
  const offset = getOffsetByDirection(direction, 32);
  const angle = getAngleByDirV2(direction);
  const animKey = hitObjectType === 'GMLS' ? 'GMLS_imp' : 'impact_heart';

  const impactVfx = scene.add.sprite(offset.x, offset.y, animKey, 0).setOrigin(0.5).setDepth(400);
  if (angle) impactVfx.setAngle(angle + 90);
  player.add(impactVfx);
  AnimationsController.play(impactVfx, animKey);
};

// SocketEvents
function handleCollisions(data: CollisionEvent): void {
  // console.log('handleCollision', data);

  if ((data.type === 'fireCollision' || data.type === 'meleeCollision') && !isTrueSpectator(selectedPlayer.isSpectator)) {
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if ((data.playerHit && data.playerHit.collisionObjectId && data.playerHit.id && data.type === 'fireCollision') || data.update) {
      const group = data.type === 'fireCollision' ? 'missiles' : 'meleeGroup';
      const phaserObject: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container = getGroupMemberById(
        data.playerHit ? data.playerHit.collisionObjectId : data.id,
        group,
      );
      if (phaserObject) {
        if (data.playerHit) {
          phaserObject.setData('playerHitId', data.playerHit.id);
        }
        if (data.update) {
          phaserObject.setData('hitObjectType', data.update.hitObjectType);
          const damage: Damage = data.update.damage;
          if (damage) {
            phaserObject.setData('hitObjectId', damage.id);
            // only for players
            if (!damage.id.includes('PLM2') && !damage.id.includes('GMLS')) showDamage(damage);
          }
        }
      }
    }

    if (data.playerHit) {
      if (isSelectedPlayer(data.playerHit.id)) {
        const damagePoints = data.playerHit.damage; // Math.abs(scene[Players.selectedPlayer.id].health - data.playerHit.health);
        scene[Players.selectedPlayer.id].setData('damageDiff', damagePoints);
        if (scene[Players.selectedPlayer.id].isGracePeriod) {
          SFXController.playFX('invalid_attack');
          return;
        }
      }

      if (data.type === 'fireCollision' && isSelectedPlayer(data.playerHit.id)) {
        // console.log('fireCollision');
        SFXController.playFX('gotchi_hit_hazard');
      }

      handleDamage(data.playerHit);
      handleHitAnim(data);
    }
  }

  if (data.type === 'parcelCollision') {
    if (data.parcel?.id) Players.currentParcel = data.parcel.id;
  }

  if (data.type === 'aarena') {
    if (!isSelectedPlayer(data.player) || data.action !== 'enter') return;
    SFXController.musicStop();
    _.delay(() => {
      void Router.push('/combat');
    }, 1000);
  }

  // evasion
  if (data.type === 'evasion' && data.playerHit) {
    // console.log('evasion', data);
    if (!scene[data.playerHit.id]) return;

    SFXController.playFX('evade');
    const evadeVfx = scene.add.sprite(0, 0, 'evade').setOrigin(0.5).setName('evade');
    moveToLastOrder(data.playerHit.id, evadeVfx);
    AnimationsController.play(evadeVfx, 'evade');
  }

  if (data.player && data.player === selectedPlayer.id) {
    if (data.type === 'statueCollision') {
      // console.log('statueCollision');
      handleStatue(data);
    }
    if (data.type === 'wallCollision' && !data.playerHit) {
      // console.log('wallCollision');
      SFXController.playFX('bump');
      Players.playerCanMove = false;
    }

    const validGroundCollisions = ['road', 'ground', 'hazard', 'fud', 'fomo', 'alpha', 'kek'];
    if (validGroundCollisions.includes(String(data.type))) handleGround(data);
  }
}

function handlePositions(data: PositionEvent[]): void {
  data.forEach((player) => updatePlayerPosition(player));
}

function handleGround(data) {
  if (data.type === Players.groundType) return;
  if (data.type === 'road') {
    scene.isOnRoad = true;
    SFXController.playFX('gotchi_road_intro');
    SFXController.soundLoopPlay('gotchi_road_idle');
  } else if (data.type === 'ground' || data.type === 'hazard') {
    if (scene.isOnRoad && SFXController.isPlaying('gotchi_road_idle')) SFXController.playFX('gotchi_road_outro');
    SFXController.soundLoopStop();
    scene.isOnRoad = false;
  } else {
    SFXController.soundLoopPlay(`alchemica_${data.type}`);
  }
  Players.groundType = data.type;
}

function handleRoadSound(isMoving: boolean): void {
  if (isMoving && scene?.isOnRoad && !InputController.isSprinting()) {
    if (!SFXController.isPlaying('gotchi_road_idle')) SFXController.soundLoopPlay('gotchi_road_idle');
  } else {
    if (SFXController.isPlaying('gotchi_road_idle')) SFXController.soundLoopStop('gotchi_road_idle');
  }
}

function handleStatue(data) {
  scene.statueCollision.play();
}

function handleGlow(player) {
  const { id, collateralColor, level } = player;

  const aura = getAura(collateralColor, level);
  if (!scene[id].getByName('light')) scene[`${id}_bottom`].addAt(aura, 0);
}

function getAura(auraColor: string, level: number) {
  // secondary color for weth : #d3376d
  if (!auraColor || auraColor === '#000000') {
    auraColor = '#d3376d';
  }
  // console.log('getAura color ', auraColor);
  const color = auraColor.replace('#', '0x');
  // light prop
  const radius = Phaser.Math.Clamp(248 + (level * 512) / 100, 124, 1024);
  const intensity = Phaser.Math.Clamp(0.5 + level / 40, 0.5, 3.5);
  // console.log("level ", level);

  let attenuation = 0.075;
  if (level <= 10) attenuation = 0.055;
  else if (level <= 20) attenuation = 0.045;
  else if (level <= 50) attenuation = 0.03;
  else attenuation = 0.025;

  // console.log(`### level ${level} radius ${radius} intensity ${intensity} attenuation ${attenuation}`);

  const light = scene.add.pointlight(0, 0, Number(color), radius, intensity, attenuation).setName('light');
  light.setDepth(1);
  return light;
}

const handleDamage = (data: Damage): void => {
  const { id, playerDied } = data;
  const player = scene[id];
  if (!player) return;
  showDamage(data);
  updateHealth(data as Health);
  if (playerDied) handlePlayerDeath(id);
};

const updateHealth = (data: Health): void => {
  const { id, health, maxHealth } = data;
  const player = scene[id];
  if (!player) return;
  const nextHealth = Number(health);
  player.health = Number.isFinite(nextHealth) ? nextHealth : 0;
  if (Number.isFinite(Number(maxHealth)) && Number(maxHealth) > 0) {
    player.maxHealth = Number(maxHealth);
  }
  const healthBar = scene[`${id}_top`]?.getByName('health');
  if (healthBar) healthBar.getDamage(player.health, player.maxHealth);
  // update UI for selected player in one place
  if (Players.isSelectedPlayer(id)) GlobalState.REALM.dispatch({ type: 'UPDATE_PLAYERS_HEALTH', health: player.health });
};

const handlePlayerDeath = (id: string): void => {
  const player = scene?.[id];
  if (!player) return;
  const death = scene.add.sprite(player.x, player.y, 'death', 0).setOrigin(0.5).setDepth(502);
  scene.tweens.add({
    targets: death,
    y: player.y - 64,
    duration: 3000,
    ease: Phaser.Math.Easing.Sine.InOut,
    onStart: () => {
      SFXController.fadeIn('death');
      AnimationsController.play(death, 'death');
    },
  });
};

// this utility method lets us update properties against player objects that are still loading
// subsequent updates to the player object will replace those set from an earlier request
const updateLoadingPlayerProps = (id, props): void => {
  const playerAlreadyLoadingObj = _.find(scene.playersToLoad, ['id', id]);
  console.warn(
    `updateLoadingPlayerProps: tried to set props on player ${id} that is still loading: ${Boolean(
      playerAlreadyLoadingObj,
    )}. Will apply after load: ${JSON.stringify(props)}`,
  );
  if (playerAlreadyLoadingObj) {
    Object.assign(playerAlreadyLoadingObj, props);
  }
};

// change death state of a loaded gotchi. Use this instead of toggleVisible directly when visiblity is changed due to death state change
const setDeadState = (id: string, isDead: boolean): void => {
  if (!scene[id]) {
    updateLoadingPlayerProps(id, { isDead });
  } else {
    scene[id].isDead = isDead;
    if (isSelectedPlayer(id)) InputController.updateDisableKeyboard(isDead);
    toggleVisible(id, !isDead);
  }
};

function handleRespawn(id: string, duration = 3000): void {
  if (!scene[id]) {
    // since gotchi asset didn't exist to spawn yet, we update the properties for when it does spawn
    // override any death state and setting created:true ensures it plays the spawn animation right away
    updateLoadingPlayerProps(id, { isDead: false, created: true });
  } else {
    setDeadState(id, false);
    let isSpectator = false;
    let playerSprite = scene[id].getByName('gotchi_sprite');
    if (!playerSprite) {
      isSpectator = true;
      playerSprite = scene[id].getByName('spectator');
    }

    if (playerSprite) {
      if (GameController.MAP === 'aarena') {
        if (scene[`${id}_top`].getByName('health')) {
          scene[`${id}_top`].getByName('health').destroy();
        }
        toggleHealthBar(id, true, scene[id].maxHealth);
      }

      playerSprite.setAlpha(0.5);
      scene.time.addEvent({
        delay: duration,
        callback: () => {
          playerSprite.setAlpha(1);
        },
        callbackScope: this,
        loop: false,
      });
    }
    if (!isSpectator) {
      gotchiSpawnAnim(id);
      handleGracePeriod(id);
    }
  }
}

function handleSideView(id: string, direction: Vector2): number {
  if (direction) {
    const facingDirection = getDirectionByVector360(direction);
    const player = scene[id].getByName('gotchi_sprite');
    if (player) {
      if (facingDirection === 'right') {
        player.setFrame(2);
        return 2;
      } else if (facingDirection === 'left') {
        player.setFrame(1);
        return 1;
      } else if (facingDirection === 'down') {
        player.setFrame(0);
        return 0;
      } else if (facingDirection === 'up') {
        player.setFrame(3);
        return 3;
      }
    } else {
      const spectatorEye = scene[id].getByName('spectator').getByName('spectator_eye');
      if (spectatorEye) {
        // console.log('handle spectatorEye', direction);
        if (direction.x === 1) {
          spectatorEye.setPosition(4, -3);
          return 2;
        } else if (direction.x === -1) {
          spectatorEye.setPosition(-4, -3);
          return 1;
        } else if (direction.y === 1) {
          spectatorEye.setPosition(0, 0);
          return 0;
        } else if (direction.y === -1) {
          spectatorEye.setPosition(0, -5);
          return 3;
        } else if (direction.x === 0 && direction.y === 0) {
          // back to center
          spectatorEye.setPosition(0, -3);
          return 0;
        }
      }
    }
  } // end direction check
} // end function

function updateServerDirection(direction: Direction, sprint = false): void {
  if (!playerSocketInited) {
    // don't register mouse / key event changes until inited
    return;
  }

  if (isTrueSpectator(selectedPlayer.isSpectator)) {
    sprint = false;
  }

  if (direction !== scene.lastUpdate.direction || sprint !== scene.lastUpdate.sprint) {
    if (direction === Direction.NONE) {
      scene.isMoving = false;
    } else {
      scene.isMoving = true;
    }
    Players.handleRoadSound(scene.isMoving);
    GameController.sendData('movement', 'keys', { direction, isSprint: direction === Direction.NONE ? false : sprint });
    scene.lastUpdate.direction = direction;
    scene.lastUpdate.sprint = sprint;
    if (direction !== Direction.NONE) Performance.start('positions');
  }
}

function displayChatBubble(data): void {
  const gotchi = scene[`${data.id}_top`];
  if (!gotchi) return;

  const stoppedTyping = data.state === false;
  const startedTyping = data.state === true;

  const typingBubbles = gotchi.bubblesContainer.getAll('typingBubble', true);
  // Remove typing bubble from stack
  if (stoppedTyping) typingBubbles.forEach((bubble) => bubble.disappear());

  let newBubble;
  if (data.message) {
    newBubble = new ChatBubblePhaser(scene, data.message, isSelectedPlayer(data.id));
  } else if (startedTyping && !typingBubbles.length) {
    newBubble = new ChatBubblePhaser(scene, '...', null, true);
  }

  let bubbles = gotchi.bubblesContainer.getAll().slice().reverse();
  if (newBubble) bubbles = [newBubble].concat(bubbles);
  let cumulativeHeight = 0;
  bubbles.forEach((bubble) => {
    cumulativeHeight -= bubble.height;
    if (bubble.y !== cumulativeHeight) bubble.slide(cumulativeHeight);
    cumulativeHeight -= 10;
  });

  if (newBubble) {
    if (!newBubble.typingBubble && gotchi.bubblesContainer.length >= 2) gotchi.bubblesContainer.getFirst().disappear();
    setTimeout(() => gotchi.bubblesContainer.add(newBubble), gotchi.bubblesContainer.length >= 1 ? 200 : 0);
  }
}

function updateFocusTransparency(data: FocusEventData): void {
  // Make a gotchi transparent or not depending on whether it is focused on the game or not
  const player = scene[data.id];
  if (!player) return;
  const name = scene[`${data.id}_top`];
  const alpha = data.state ? 1 : 0.5; // Make semi-transparent if focus is false

  player.setAlpha(alpha);
  name.setAlpha(alpha);

  // reset charged attack
  if (isSelectedPlayer(data.id) && !data.state) {
    if (player.chargedContainer) {
      player.setData('isMeleeCharging', false);
      player.setData('isMissileCharging', false);
      player.chargedContainer.destroy(true);
    }
  }
}

const Players: PlayersObj = {
  init,
  initPlayer,
  addPlayers,
  removePlayers,
  getPlayerData,
  getPlayerDataIdName,
  updatePlayerPosition,
  updateServerDirection,
  updateHealth,
  handleDamage,
  handleClickToMove,
  handleCollisions,
  handlePositions,
  isSelectedPlayer,
  handlePlayerDeath,
  toggleHealthBar,
  onPlayerSocketInit,
  handleEmoteEvent,
  displayChatBubble,
  updateFocusTransparency,
  playerCanMove: true,
  groundType: '',
  soundFadingTween: null,
  selectedPlayer,
  mouseUpdateInterval,
  alchemicaType: '',
  currentParcel: '',
  updatePlayerHealth,
  handleRoadSound,
  isSpectator,
  handleStartSpin,
  handleStopSpin,
  setDeadState,
  toggleVisible,
  handleRespawn,
  checkInvisible,
};

export default Players;
