import Players from 'components/phaser/Players';
import { updateSetting } from 'contexts/SettingsContext/actions';
import { getSimpleDecorationSpriteMetadata, getTypeById, isNFTDisplay, isSimpleDecoration } from 'helpers/installations.helper';
import { getDirectionByPosition } from 'helpers/phaser.helper';
import _ from 'lodash';
import { MusicTheme, SpatialAudioFX } from 'types';
import { scene } from 'components/controllers/SceneController';
import { SoundAction, SoundConfig, SoundType } from 'types/phaser';
import AssetsController from './assetsController';
import GlobalState from 'contexts/GlobalState';
import GameController from './GameController';
import { checkTokensAllowance } from 'web3/contract';

const NFTConfig = {
  137: 'nft_basic_short',
  138: 'nft_basic_long',
  139: 'nft_basic_short',
  140: 'nft_basic_short',
  141: 'nft_golden_short',
  142: 'nft_golden_long',
  143: 'nft_golden_short',
  144: 'nft_golden_short',
  157: 'nft_basic_long',
  158: 'nft_basic_long',
  159: 'nft_basic_long',
  160: 'nft_basic_long',
  161: 'nft_golden_long',
};

// MUSIC THEMES
let currentMusicTheme: MusicTheme = 'theme_citaadel';

// SFX
let loopTrack = '';
const loopList = {};

// SPATIAL
let spatialAudios: SpatialAudioFX[] = [];
const spatialPlayQueue = {};
// spatial queue for loadingthe audios

interface SFXControllerInterface {
  createAudio: (sound: SoundConfig) => void;
  musicPlay: (track: MusicTheme) => void;
  musicStop: (track?: MusicTheme, fadeDuration?: number, nextTheme?: MusicTheme) => void;
  ensureMusicUnlocked: () => void;
  fadeIn: (sound, fadeDuration?: number) => void;
  fadeOut: (sound, fadeDuration?: number, type?: string) => void;
  soundLoopPlay: (track) => void;
  soundLoopStop: (sound?: string) => void;
  updateSpatialVolume: (items: SpatialAudioFX[], play?: boolean) => void;
  toggleSettings: (type: SoundType) => void;
  playFX: (sound) => void;
  isPlaying: (sound: string) => boolean;
  updateSpatialFX: () => void;
  setSpatialAudios: (item: SpatialAudioFX, action: boolean) => void;
  calculateClosestSpatial: (sounds: SpatialAudioFX[]) => SpatialAudioFX[];
  handleEquipSounds: (id: string, x: number, y: number) => void;
  playSpatialFX: (sounds: SpatialAudioFX[]) => void;
  getDefaultMusicTheme: () => MusicTheme;
  clearSpatial: () => void;
  spatialPlayQueue;
}

const musicPlay = (musicTheme: MusicTheme): void => {
  if (!GlobalState.SETTINGS.state.allowMusic) {
    currentMusicTheme = musicTheme || currentMusicTheme;
    return;
  }
  if (!scene.sounds?.[currentMusicTheme]?.isPlaying) currentMusicTheme = musicTheme || currentMusicTheme;
  if (musicTheme === currentMusicTheme && scene.sounds?.[currentMusicTheme]?.isPlaying) return;
  musicStop(currentMusicTheme, 1000, musicTheme);
  currentMusicTheme = musicTheme || currentMusicTheme;
};

const musicStop = (musicTheme?: MusicTheme, fadeDuration = 1000, nextTheme?: MusicTheme): void => {
  if (!musicTheme) {
    fadeOut(currentMusicTheme, 0);
    return;
  }
  if (scene.sounds[musicTheme]?.isPlaying) {
    fadeOut(musicTheme || currentMusicTheme, fadeDuration, nextTheme);
  } else if (nextTheme) fadeIn(nextTheme, fadeDuration);
};

/** Retry BGM after the browser unlocks AudioContext (autoplay policies). */
const ensureMusicUnlocked = (): void => {
  if (!scene?.sound || !GlobalState.SETTINGS.state.allowMusic) return;
  const soundManager = scene.sound as Phaser.Sound.BaseSoundManager & {
    locked?: boolean;
    once?: (event: string, callback: () => void) => void;
  };
  const tryPlay = () => {
    if (!GlobalState.SETTINGS.state.allowMusic) return;
    const theme = currentMusicTheme || getDefaultMusicTheme();
    if (!scene.sounds?.[theme]?.isPlaying) musicPlay(theme);
  };
  if (soundManager.locked && typeof soundManager.once === 'function') {
    soundManager.once('unlocked', tryPlay);
  } else {
    // Already unlocked or unknown — nudge once after a tick in case load raced connect.
    window.setTimeout(tryPlay, 500);
  }
};

const soundLoopPlay = (sound: string): void => {
  if (!GlobalState.SETTINGS.state.allowSound) return;
  if (!soundCheck(sound, 'sound-loop')) return;
  if (loopTrack === sound) return;
  soundLoopStop();
  fadeIn(sound);
  loopTrack = sound;
  loopList[sound] = scene.sounds[sound];
};

const handleEquipSounds = (id: string, posX: number, posY: number): void => {
  const { itemId } = getTypeById(id);
  // console.log('handleEquipSounds', id, installationType);
  // only fountain for this release
  const installationContainer = scene.installationGroup.get(id);
  if (itemId === 55) {
    setSpatialAudios({ id: id, key: 'fountain', x: posX, y: posY }, true);
    installationContainer?.data.set('spatial', 'fountain');
  }
  if (itemId === 145) {
    setSpatialAudios({ id: id, key: 'bounce_gaate', x: posX, y: posY }, true);
    installationContainer?.data.set('spatial', 'fountain');
  }
  if (isSimpleDecoration(itemId)) {
    void getSimpleDecorationSpriteMetadata(itemId).then(({ key }) => {
      setSpatialAudios({ id: id, key, x: posX, y: posY }, true);
    });
  }

  if (isNFTDisplay(itemId)) setSpatialAudios({ id: id, key: NFTConfig[itemId], x: posX, y: posY }, true);

  // else if (installationType === 1) {
  //   // add harvesters
  //   setSpatialAudios({ id: id, key: `${installationType}_${alchemicaType}`, x: posX, y: posY }, true);
  // }
};

// x,y,key, distance
const setSpatialAudios = (item: SpatialAudioFX, action: boolean): void => {
  // console.log('@spatialAudios', spatialAudios);

  soundCheck(item.key);
  if (action) {
    const soundConfig = AssetsController.allSoundsConfig[item.key];
    _.assign(item, { type: soundConfig?.type === ('MUSIC' as SoundType) ? ('MUSIC' as SoundType) : ('FX' as SoundType) });
    spatialAudios = _.union(spatialAudios, [item]);
  } else {
    const spatial = _.find(spatialAudios, ({ id }) => id === item.id);
    if (!spatial) return;

    _.remove(spatialAudios, spatial);
    const phaserSound = scene.sounds[spatial.key];
    if (spatial.type === 'MUSIC') musicPlay(getDefaultMusicTheme());
    if (phaserSound?.isPlaying) {
      phaserSound.stop();
    }
  }
  const closest = calculateClosestSpatial(spatialAudios);
  updateSpatialVolume(closest);
};

const playSpatialFX = (sounds: SpatialAudioFX[]): void => {
  _.map(sounds, (sound) => {
    const soundConfig = AssetsController.allSoundsConfig[sound.key];
    _.assign(sound, { type: soundConfig?.type === ('MUSIC' as SoundType) ? ('MUSIC' as SoundType) : ('FX' as SoundType) });
  });
  const closest = calculateClosestSpatial(sounds);
  let soundLoaded = true;
  _.each(closest, (spatial) => {
    if (!soundCheck(spatial.key, 'spatial-play')) {
      // add sound to a queue to be played in spatial after load
      spatialPlayQueue[spatial.key] = [spatial];
      soundLoaded = false;
    } else {
      const phaserSound = scene.sounds[spatial.key];
      if (phaserSound?.isPlaying) _.remove(closest, spatial);
    }
  });
  if (soundLoaded) updateSpatialVolume(closest, true);
};

// x,y,key, distance
const updateSpatialVolume = (sounds: SpatialAudioFX[], play?: boolean): void => {
  const gotchi = scene[Players.selectedPlayer.id];
  if (!gotchi) return;
  _.forEach(sounds, (sound) => {
    const phaserSound = scene.sounds[sound.key];
    // Sanity check, if sound is not loaded yet it will not play.
    if (!phaserSound) return;
    const config = AssetsController.allSoundsConfig[sound.key];
    if (sound.mute) return phaserSound.stop();
    const innerRadius = config?.spatial?.spatialInnerRange || 196;
    const outerRadius = config?.spatial?.spatialOuterRange || 896;
    const maxVolume = config?.volume || 0.7;
    const normalizedSound = 1 - sound.distance / outerRadius;
    const volume = sound.distance < innerRadius ? maxVolume : Phaser.Math.Clamp(normalizedSound, 0, maxVolume).toFixed(4);
    const pan = sound.direction.x * (1 - phaserSound?.volume || 0);
    // console.log(`pan sound ${pan}`);
    const outsideRadius: boolean = sound.distance > outerRadius;
    try {
      if (phaserSound) phaserSound.volume = volume;
      if (sound.type === 'FX') phaserSound.pan = pan;
    } catch (error) {}

    if ((phaserSound && !phaserSound.isPlaying && sound.type === 'FX') || play) playFX(sound.key);

    // Handle Music change, if outside any radius the general music theme should play!
    if (sound.type === 'MUSIC') {
      if (phaserSound.isPlaying && phaserSound.fadeTween) phaserSound.fadeTween.stop();
      if (outsideRadius) {
        if (currentMusicTheme !== getDefaultMusicTheme()) musicPlay(getDefaultMusicTheme());
      } else if (currentMusicTheme !== sound.key) musicPlay(sound.key as MusicTheme);
    }
  });
};

const calculateClosestSpatial = (sounds: SpatialAudioFX[]): SpatialAudioFX[] => {
  const closestSpatialList: SpatialAudioFX[] = [];
  const gotchi = scene[Players.selectedPlayer.id];
  if (!gotchi) return [];
  const list = _.map(sounds, (item) => {
    // in case positions were not defined
    item.x = item.container?.x || item.x;
    item.y = item.container?.y || item.y;
    const distance = Phaser.Math.Distance.Between(gotchi.x, gotchi.y, item.x, item.y);
    const direction = getDirectionByPosition({ x: gotchi.x, y: gotchi.y }, { x: item.x, y: item.y });
    return {
      ...item,
      distance,
      direction,
    };
  });

  // Get separate type MUSIC closest.
  const groupByType = _.groupBy(list, (i) => i.type);
  if (groupByType.MUSIC) closestSpatialList.push(_.minBy(groupByType.MUSIC, (sound) => sound.distance));

  // Calculate min distance of each FX object based on key
  if (groupByType.FX) {
    const groupByKey = _.groupBy(groupByType.FX, (i) => i.key);
    _.each(groupByKey, (list) => {
      const min = _.minBy(list, (sound) => sound.distance);
      closestSpatialList.push(min);
    });
  }

  // if (closestSpatialList.length) console.log('@calculateClosestSpatial', closestSpatialList);
  return closestSpatialList;
};

// just throttle calculateClosestSpatial
const updateSpatialFX = _.throttle(
  () => {
    if (!scene) return;
    const gotchi = scene[Players.selectedPlayer.id];
    if (!gotchi) return;
    // console.log('@spatialAudios', spatialAudios);
    const closest = SFXController.calculateClosestSpatial(spatialAudios);
    updateSpatialVolume(closest);
  },
  100,
  { leading: false, trailing: true },
);

const isPlaying = (sound: string): boolean => {
  return scene.sounds[sound]?.isPlaying;
};

const soundLoopStop = (sound?: string): void => {
  loopTrack = '';
  if (sound) {
    fadeOut(sound);
  } else {
    for (const i in loopList) {
      if (loopList[i]?.isPlaying) {
        fadeOut(i);
      }
    }
  }
};

const createAudio = (sound: SoundConfig): boolean => {
  // console.log('@createAudio', sound);
  // we're making sure that sound is in cache by creating it immediatly after load
  if (!scene.cache.audio.has(sound.id) || scene.sounds[sound.id]) return false;
  try {
    let soundKey = sound.id;
    scene.sounds[soundKey] = scene.sound.add(sound.id, _.pick(sound, ['volume', 'loop']));
    // create multiple instance from 0 to how many instances we want;
    if (sound.instances) {
      for (let i = 0; i < sound.instances; i++) {
        soundKey = `${sound.id}_${i}`;
        // add it to config so we can access it later
        AssetsController.allSoundsConfig[soundKey] = sound;
        scene.sounds[soundKey] = scene.sound.add(sound.id, _.pick(sound, ['volume', 'loop']));
      }
    }
    return true;
  } catch (error) {
    console.log('@createAudio:ERR', error);
    return false;
  }
};

const playNextSound = () => {
  if (loopTrack !== '') fadeIn(loopTrack);
};

const fadeIn = (sound: string, fadeDuration = 500): void => {
  if (!soundCheck(sound, 'fadeIn')) return;
  const phaserSound = scene.sounds[sound];
  if (!phaserSound) return;
  const soundConfig = AssetsController.allSoundsConfig[sound];
  let fromVolume = 0;
  if (phaserSound.fadeTween) {
    fromVolume = phaserSound.volume;
    phaserSound.fadeTween.stop();
  }
  phaserSound.fadeTween = scene.tweens.add({
    targets: scene.sounds[sound],
    volume: { from: fromVolume, to: soundConfig?.volume || 0.3 },
    duration: fadeDuration,
    delay: 0,
    ease: 'Power0',
    onStart: () => {
      phaserSound.play();
    },
    onComplete: () => {
      phaserSound.fadeTween = undefined;
    },
  });
};

const soundCheck = (sound: string, action?: SoundAction): boolean => {
  // console.log('@soundCheck', sound, action);
  if (sound === '' || !sound) return false;

  const soundConfig = AssetsController.allSoundsConfig[sound];
  if (!soundConfig) {
    console.warn(`@soundCheck: Sound not found in config: ${sound}`);
    return;
  }

  const allowType = soundConfig.type === 'MUSIC' ? GlobalState.SETTINGS.state.allowMusic : GlobalState.SETTINGS.state.allowSound;
  if (!allowType) return false;
  if (!scene.sounds[sound]) {
    // sound is not created
    if (!scene.cache.audio.has(sound)) {
      // sound was not loaded and added to cache
      // assign action to take place after load & sound creation
      if (action) soundConfig.action = action;
      AssetsController.loadAudio(sound);
      // console.log('@soundCheck: Sound not loaded: loading...', sound);
    }
    return false;
  } else return true;
};

const playFX = (sound: string): void => {
  if (!soundCheck(sound, 'play')) return;
  scene?.sounds?.[sound]?.play();
};

const fadeOut = (sound: string, fadeOutDuration = 500, nextTheme?: MusicTheme): void => {
  const phaserSound = scene.sounds[sound];
  if (phaserSound?.isPlaying && phaserSound.volume > 0.1) {
    if (phaserSound.fadeTween) phaserSound.fadeTween.stop();
    phaserSound.fadeTween = scene.tweens.add({
      targets: phaserSound,
      volume: { from: phaserSound.volume, to: 0 },
      duration: fadeOutDuration,
      delay: 0,
      ease: 'Power0',

      onComplete: () => {
        phaserSound.stop();
        phaserSound.fadeTween = undefined;
        if (nextTheme) fadeIn(nextTheme, 1000);
      },
    });
  } else {
    if (nextTheme) fadeIn(nextTheme, 1000);
  }
};

const toggleSettings = (type: SoundType): void => {
  if (type === 'FX') {
    GlobalState.SETTINGS.state.allowSound = !GlobalState.SETTINGS.state.allowSound;

    if (GlobalState.SETTINGS.state.allowSound) {
      if (Players.groundType === 'road') {
        soundLoopPlay('gotchi_on_road');
      } else if (Players.groundType !== 'ground') {
        soundLoopPlay(`alchemica_${Players.groundType}_sound`);
      }
    } else {
      soundLoopStop();
    }

    // toggle spatial audio sound volume on or off as well
    if (spatialAudios?.length) {
      _.map(spatialAudios, (sound) => (sound.mute = sound.type === 'FX' ? !GlobalState.SETTINGS.state.allowSound : sound.mute));
      const closest = SFXController.calculateClosestSpatial(spatialAudios);
      updateSpatialVolume(closest);
    }

    updateSetting(
      {
        type: 'UPDATE_ALLOW_SOUND',
        value: GlobalState.SETTINGS.state.allowSound,
      },
      GlobalState.SETTINGS.dispatch,
    );
  } else {
    GlobalState.SETTINGS.state.allowMusic = !GlobalState.SETTINGS.state.allowMusic;
    GlobalState.SETTINGS.state.allowMusic ? musicPlay(currentMusicTheme) : musicStop();

    updateSetting(
      {
        type: 'UPDATE_ALLOW_MUSIC',
        value: GlobalState.SETTINGS.state.allowMusic,
      },
      GlobalState.SETTINGS.dispatch,
    );
  }
};

const getDefaultMusicTheme = () => {
  return GameController.MAP === 'aarena' ? 'theme_aarena' : 'theme_citaadel';
};

const clearSpatial = (): void => {
  spatialAudios = undefined;
};

const SFXController: SFXControllerInterface = {
  createAudio,
  isPlaying,
  // actions
  playFX,
  fadeIn,
  fadeOut,
  musicPlay,
  musicStop,
  ensureMusicUnlocked,
  soundLoopPlay,
  soundLoopStop,
  toggleSettings,
  setSpatialAudios,
  // SPATIAL
  updateSpatialFX,
  handleEquipSounds,
  updateSpatialVolume,
  calculateClosestSpatial,
  playSpatialFX,
  spatialPlayQueue,
  clearSpatial,
  getDefaultMusicTheme,
};

export default SFXController;
