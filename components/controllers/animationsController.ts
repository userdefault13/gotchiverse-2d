import _ from 'lodash';
import AssetsController from './assetsController';
import { AnimConfig, TextureConfig } from 'types/phaser';
import { scene } from './SceneController';
import GlobalState from 'contexts/GlobalState';
import { AttackDestroyType } from 'types';
import MapController from './MapController';
import GameController from './GameController';

// create animations with frame config

const animConfigs = {};
const depositStations = [];
const alchemicaSpritesFrames = {
  alpha_small: 0,
  alpha_medium: 6,
  alpha_large: 12,
  fomo_small: 18,
  fomo_medium: 24,
  fomo_large: 30,
  fud_small: 36,
  fud_medium: 42,
  fud_large: 48,
  kek_small: 54,
  kek_medium: 60,
  kek_large: 66,
};

const chatList = ['heart', 'exclam', 'happy', 'unhappy', 'omg', 'fire', 'lightning'];
// animations/sprite key is same as  the item of the installationsList
const installationList = [
  '0_0',
  '1_0',
  '1_1',
  '1_2',
  '1_3',
  '2_0',
  '2_1',
  '2_2',
  '2_3',
  '6_0',
  '137',
  '138',
  '139',
  '140',
  '141',
  '142',
  '143',
  '144',
  '145',
];

// 'nft_large', 'nft_smol', 'lodge' (want to test aaltar, harv, res first)

interface animationsControllerInterface {
  create: () => Promise<void>;
  tweenOpacity: (sprite, duration: number) => void;
  play: (object, animation: string, callback?: () => void, saveSprite?: boolean) => void;
  alchemicaSpritesFrames;
  playObjectsAnim: () => void;
  getAttackDestoryTypeByHitObjectType: (type?: 'wall' | 'player') => AttackDestroyType;
}

const create = async (): Promise<void> => {
  depositStations.length = 0;

  // createAnimaiton for all preload textures
  const preloadAnim = _.values(AssetsController.allAnimationsConfig) as TextureConfig[];
  for (let i = 0; i < preloadAnim.length; i++) {
    const animation = preloadAnim[i];

    // if is not a separate animation, texture createates an animation with the same key
    const parentConfig = animation.animationConfig?.configKey ? AssetsController.allTexturesConfig[animation.animationConfig.configKey] : animation;
    if (parentConfig.preload) {
      if ((GameController.MAP === 'aarena' && !parentConfig.map) || parentConfig.map !== 'aarena') continue;
      await createDynamicAnim(animation.id);
    }
  }

  if (GlobalState.SETTINGS.state.allowInstallationAnimations && GameController.MAP === 'citaadel') {
    await createInstallationAnim();
  }
  // await globalCreateAnimation(['chat'], chatList);
};

// const globalCreateAnimation = async (list, animationTypes, isLoop = false, hide = false) => {
//   for (let i = 0; i < list.length; i++) {
//     const key = list[i];
//     const animData = await getAnimConfig(key);
//     for (let j = 1; j <= animationTypes.length; j++) {
//       void createAnimationFromConfig(`${animationTypes[j - 1]}_${key}`, {
//         frames: animData.frames.slice((j - 1) * animData.animations[j - 1].numberOfFrames, animData.animations[j - 1].numberOfFrames * j),
//         isLoop,
//         hide,
//       });
//     }
//   }
// };

interface Frame {
  duration: number;
  tileid?: number;
  offset?: {
    x: number;
    y: number;
  };
  sfx?: string;
  key: string;
  frame: number;
}

interface AnimationFramesConfig {
  frames: Frame[];
  numberOfAnimations: number;
  animations: Array<{ numberOfFrames: number; id: number; index: number; frames: Frame[] }>;
}

const getAttackDestoryTypeByHitObjectType = (type?: 'player' | 'wall'): AttackDestroyType => {
  if (!type) return 'air';

  switch (type) {
    case 'player':
      return 'imp';
    case 'wall':
      return 'dud';
    default:
      return 'air';
  }
};

// key should be the sprite key
const getAnimConfig = async (key: string, jsonData?): Promise<AnimationFramesConfig> => {
  if (!jsonData) jsonData = await AssetsController.getJsonAssets(key);
  if (animConfigs[key]) return animConfigs[key];
  const frames = [];
  const tilesArray = jsonData?.tiles;
  // no animations;
  if (!tilesArray) return;
  tilesArray.forEach((item) => {
    item.animation.forEach((tile) => {
      // duration for each frame
      frames.push({
        key,
        frame: tile.tileid,
        duration: tile.duration,
        customData: _.omit(tile, ['duration', 'tileid']),
        // visible: false,
      });
    });
  });
  // get number of frames in array and get number of frames for each ties.animation
  const animations = _.map(jsonData.tiles, (item) => {
    return {
      id: item.id,
      numberOfFrames: item.animation.length,
      frames: _.map(item.animation, (tile) => {
        return { key, frame: tile.tileid, duration: tile.duration, customData: _.omit(tile, ['duration', 'tileid']) };
      }),
    };
  });
  animConfigs[key] = { frames, numberOfAnimations: jsonData.tiles.length, animations };
  return animConfigs[key];
};

const spawnDepositStations = () => {
  const deposits = _.flatMap(_.values(MapController.depositesJSON));

  // console.log('spawn deposite station ', deposites);
  if (deposits && _.keys(deposits).length) {
    deposits.forEach((item) => {
      if (item?.position) {
        const { x, y } = item.position;
        const vortex = scene.add
          .sprite(x * 64, y * 64, 'deposit_vortex', 0)
          .setOrigin(0.5)
          .setDepth(199);
        const crystal = scene.add
          .sprite(x * 64, y * 64 - 128, 'deposit_crystal', 0)
          .setOrigin(0.5)
          .setDepth(300);
        depositStations.push({ v: vortex, c: crystal });
      } else {
        console.warn('spawnDepositStations, entry invalid', item);
      }
    });
  }
};

const playObjectsAnim = () => {
  spawnDepositStations();
  // Circus tents → world Bazaar + DAO Satellite Office installations.
  try {
    // Lazy require avoids circular import at module load (Installations → AnimationsController).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Installations = require('components/phaser/Installations').default;
    Installations.spawnWorldBazaarsFromTents?.();
    Installations.spawnWorldDaoOffices?.();
    Installations.spawnWorldPotionShops?.();
  } catch (e) {
    console.warn('spawnWorldBazaars/DaoOffices/PotionShops failed', e);
  }
  // deposit stations
  depositStations.forEach((deposit) => {
    const vortex = deposit.v;
    const crystal = deposit.c;
    play(vortex, 'deposit_vortex');
    play(crystal, 'deposit_crystal');
  });
};

const createInstallationAnim = async () => {
  for (let i = 0; i < installationList.length; i++) {
    const item = installationList[i];
    await generateInstallationAnimations(item);
  }

  // await globalCreateAnimation(['flame'], ['alpha', 'fomo', 'fud', 'kek'], true, false);
};

// numberOfAnimations for each animation = 8
const generateInstallationAnimations = async (key: string) => {
  const animConfig = await getAnimConfig(key);

  if (!animConfig) return;
  _.each(animConfig.animations, (animation, index) => {
    const level = index + 1;
    const startFrame = index * animation.numberOfFrames;
    const endFrame = startFrame + animation.numberOfFrames;
    const frames = animConfig.frames.slice(startFrame, endFrame);
    void createAnimationFromConfig(`${key}_${level}`, { frames, isLoop: true });
    if (!AssetsController.allAnimationsConfig[`${key}_${level}`]) {
      AssetsController.allAnimationsConfig[`${key}_${level}`] = AssetsController.allTexturesConfig[key];
    }
  });
};

// const createMisc = async () => {
// alchemica_deposited anim

// halloween release pumpkins spritesheets
// const pumpkinIdleHitAnim = await getAnimConfig('pumpkin_idle_hit', AssetsController.jsonAssets.pumpkin_idle_hit);
// await createAnimationFromConfig('pumpkin_idle', { frames: pumpkinIdleHitAnim.frames.slice(7), isLoop: true, hide: false });
// await createAnimationFromConfig('pumpkin_hit', { frames: pumpkinIdleHitAnim.frames.slice(0, 7), isLoop: false, hide: false });
// }
// billow animation for lodge
// const billowAnim = getAnimConfig(billow, 'billow');
// createAnimationFromConfig('billow', billowAnim, true, true);

// await globalCreateAnimation(['observer_body'], ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'yellow'], true, false);
// await globalCreateAnimation(['observer_iris'], ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'yellow'], true, false);
// };

const play = (object: Phaser.GameObjects.Sprite, key: string, callback?: () => void, saveSprite?: boolean): void => {
  // Animation does not exist, probably a siple asset. don't play it!
  if (!AssetsController.allAnimationsConfig[key]) return;
  // quick fix for unknown err.
  if (key.includes('undefined')) return;
  if (!object?.texture) return;
  if (!scene.anims.exists(key)) {
    // console.warn('@AnimationController:ANIMATION NOT FOUND, create animation..', key);
    void createDynamicAnim(key).then(async (anim) =>
      _.delay(() => {
        // console.warn('@AnimationController AnimationRecreated:anim', key, anim);
        playCheck(object, key, saveSprite, callback);
      }, 1),
    );
    return;
  }

  if (object?.texture && object?.texture?.key !== '__MISSING') {
    if (object.texture?.key === 'maaker_bot') {
      if (scene.maakerBotsGroup.has(object.name)) {
        playCheck(object, key, saveSprite, callback);
      }
    } else {
      playCheck(object, key, saveSprite, callback);
    }
  } else {
    console.error('@AnimationsController.play:texture ERR ', key);
  }
};

const playCheck = (object: Phaser.GameObjects.Sprite, key: string, saveSprite: boolean, callback?: () => void) => {
  const animation = scene.anims.get(key);
  // console.log('playCheck', key);
  if (!animation?.frames?.[0]?.frame?.texture) {
    console.warn('@AnimationsController:Animation was broken, recreate..', key, animation);
    scene.anims.remove(key);
    // void router.reload();
    play(object, key);
  } else {
    try {
      object.play(key);
      // destroy sprite after animation finishes to cleanup memory
      const config = AssetsController.allAnimationsConfig[key]?.animationConfig;
      if (config?.hide || callback) {
        object.off('animationcomplete');
        object.on('animationcomplete', (animation) => {
          if (config?.hide && !saveSprite) object.destroy();
          if (callback && animation.key === key) callback();
        });
      }
    } catch (error) {
      console.error('@AnimationsController.play:ERR ', key);
    }
  }
};

//  create animations with frame config
const createAnimationFromConfig = async (key: string, config: AnimConfig) => {
  if (!key || !config) return;

  scene.anims.create({
    key,
    frames: config?.frames,
    repeat: config?.isLoop ? -1 : 0,
    hideOnComplete: config?.hide || false,
  });
};

const createDynamicAnim = async (key: string) => {
  const config = AssetsController.allAnimationsConfig[key]?.animationConfig;
  const animConfig = await getAnimConfig(config?.configKey || key);
  // if (key.includes('ROFL')) {
  //   console.log('createDynamicAnim', key, config, animConfig, 'ROFL');
  // }

  if (!animConfig) return;
  let frames = animConfig.frames;

  return await new Promise((resolve) => {
    if (config?.frameId !== undefined) {
      frames = _.keyBy(animConfig.animations, 'id')[config.frameId].frames;
    }
    if (config?.index !== undefined) frames = animConfig.animations[config.index].frames;
    if (config?.slice) frames = frames.slice(...config.slice);
    const animProps = {
      key,
      frames,
      repeat: config?.isLoop ? -1 : 0,
      hideOnComplete: config?.hide || false,
    };
    // if found custom duration here, framde's duration will be ignored
    if (config?.duration) {
      _.assign(animProps, { duration: config.duration });
    }

    const anim = scene.anims.create(animProps);
    // if (key.includes('ROFL')) {
    //   console.log(key, frames, anim);
    // }
    // @ts-expect-error
    _.each(anim.frames, (frame, index) => {
      if (frames[index].customData) frame.customData = frames[index].customData;
    });
    resolve(anim);
  });
};

function tweenOpacity(sprite, duration) {
  if (GlobalState.SETTINGS.state.allowInstallationAnimations) {
    scene.add.tween({
      targets: [sprite],
      duration,
      delay: 0,
      yoyo: true,
      repeat: -1,
      alpha: {
        getStart: () => 0.8,
        getEnd: () => 0.4,
      },
    });
  }
}

const AnimationsController: animationsControllerInterface = {
  create,
  tweenOpacity,
  play,
  alchemicaSpritesFrames,
  playObjectsAnim,
  getAttackDestoryTypeByHitObjectType,
};

export default AnimationsController;
