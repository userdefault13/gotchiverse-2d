import GameController from '../../controllers/GameController';
import Players from 'components/phaser/Players';
import Alchemica from 'components/phaser/Alchemicas';
import { createParallax, setZoomDefaults, updateParallax, checkMinimumZoom } from 'helpers/phaser.helper';
import AssetsController from 'components/controllers/assetsController';
import AnimationsController from 'components/controllers/animationsController';
import InputController from 'components/controllers/inputController';
import _ from 'lodash';
import { GAME_CONFIG, MAP_CONFIG_BY_ID } from 'shared_code/constants/const.game';
import SceneController, { scene } from 'components/controllers/SceneController';
import Enemies from 'components/phaser/Enemies';
import GlobalState from 'contexts/GlobalState';
import MapController from 'components/controllers/MapController';
import { SceneType } from 'types';
import { getDefaultGotchiURL, isNaked } from 'helpers/gotchi.helper';
import Quests from '../Quests';
import { initItemsHelper } from 'helpers/items.helpers';

export const getGameScene = (type: SceneType, loadedCallback: () => void) => {
  return {
    init: function () {
      this.scene.key = type;
      console.log('Scene init ...', this.scene.key);
      SceneController.setScene(this);
      MapController.init(type);

      this.playersToLoad = [];
      this.loadedPlayerIds = [];
      this.playerAvatarsToLoad = [];
      this.uiGroup = this.add.group();
      this.hudObjects = {};
      this.currentItems = [];
      this.batchQueue = [];
      this.buildModeInstallations = [];
      this.spawnedParcelsByIdMap = new Map();
      this.quests = new Map();
      this.installationGroup = new Map();
      this.enemiesGroup = new Map();
      this.itemsGroup = new Map();
      this.potionsGroup = new Map();
      this.installationsWaiting = new Map();
      this.maakerBotsGroup = new Map();
      this.pads = new Map();
      this.missiles = new Map(); // all missiles of the scene
      this.meleeGroup = new Map(); // all missiles of the scene
      this.lastUpdate = {};
      this.inputActive = true;
      this.projectiles = {}; // all missiles of the scene
      this.unrecoverableSocketError = false;
      this.gameConfig = GAME_CONFIG; // compiled and run-time updated global game config
      this.mapConfig = MAP_CONFIG_BY_ID[type]; // compiled and run-time updated map specific game config

      // pass react global to phaser global
      this.maxZoomOut = GlobalState.PHASER.state.maxZoomOut;
      this.zoom = GlobalState.PHASER.state.zoom;
      this.sounds = {};
      this.isSprint = false;

      GlobalState.PHASER.dispatch({
        type: 'UPDATE_SCENE',
        scene: this,
      });

      this.tints = {
        active: [0xa065ff],
        equip: [0x63f323],
        unequip: [0xff370a, 0x00e5e8, 0xfce762, 0xff47da],
        fud: [0x00ff00],
        fomo: [0xff0000],
        alpha: [0x00ffff],
        kek: [0x7f00ff],
      };

      Players.init();
      Enemies.init();
      Quests.init();
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const FoundryNodes = require('components/phaser/FoundryNodes').default;
        FoundryNodes.init();
      } catch (e) {
        console.warn('@gameScene FoundryNodes init skipped', e);
      }
    },

    preload: async function () {
      console.log('Scene start preload!');
      // trigger event while a chunk is loaded
      this.cache.tilemap.events.on('add', (cache, key) => {
        MapController.displayChunk(key);
      });

      await AssetsController.loadPlugins();
      await AssetsController.loadMap(type);
      await AssetsController.loadExtra();
      await AssetsController.startDynamicLoad();

      if (GlobalState.REALM.state.gotchiUrl.sprite && !isNaked(GlobalState.REALM.state.selectedPlayer.isSpectator)) {
        this.load.spritesheet(GlobalState.REALM.state.selectedPlayer.id, GlobalState.REALM.state.gotchiUrl.sprite, {
          frameWidth: 64,
          frameHeight: 64,
        });
      }
      if (GlobalState.GAME.state.gameConfig.enableNakedGotchis) {
        this.load.spritesheet('defaultGotchi', getDefaultGotchiURL(), {
          frameWidth: 64,
          frameHeight: 64,
        });
      }

      this.load.on('complete', async () => {
        loadedCallback();
        if (!this.preloaded) {
          await AnimationsController.create();
          this.preloaded = true;
        }
      });
    },

    create: async function () {
      console.log('Scene Create...');
      this.created = true;
      this.sound.pauseOnBlur = false;
      this.outLinePlugin = this.plugins.get('rexoutlinepipelineplugin');
      this.outLinePlugin?.setQuality(1);

      this.dynamicAdd = {
        ...this.add,
        image: async (x, y, key, frame) => {
          // console.log(key, frame);
          // check texture
          await AssetsController.checkLocalTexture(key);
          return this.add.image(x, y, key, frame);
        },
      };

      // await AnimationsController.create();

      Players.initPlayer(GlobalState.REALM.state.selectedPlayer);
      Alchemica.initAlchemicaHUD();
      initItemsHelper();

      if (GlobalState.SETTINGS.state.allowStarField && GameController.MAP === 'citaadel') createParallax();

      // initialsocketConnect
      GameController.socketConnect(GlobalState.REALM.state.selectedPlayer, null, 'init');

      this.scale.on('resize', function () {
        throttleZoomResize();
        if (scene.minimapCam) {
          MapController.syncMinimapViewport();
        }
      });
    },

    update: function (time, delta) {
      InputController.handleKeyboardMovement();
      if (GlobalState.SETTINGS.state.allowStarField) {
        updateParallax(GlobalState.REALM.state.selectedPlayer, delta);
      }
    },
  };
};

export const throttleZoomResize = _.throttle(
  () => {
    if (!scene) return;
    checkMinimumZoom();
    setZoomDefaults();
  },
  500,
  { leading: true, trailing: false },
);
