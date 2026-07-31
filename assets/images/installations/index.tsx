import DefaultInstallation from 'public/images/installations/png/1.png';
import DefaultTlile from 'public/images/tiles/Tile_LE_1.png';
import { Vector2 } from 'types';

import BG_LE from './BG_LE.png';
import BG_normal from './BG_normal.png';
import BG_upgrade from './BG_upgrade.png';

export interface installationSprite {
  img: string;
  frame: number;
  frameWidht: number;
  frameHiehgt: number;
  offset: Vector2;
}
const installationImgs = {};

const getInstallationDisplays = (id) => {
  let img;
  if (installationImgs[id]?.img) {
    img = installationImgs[id].img;
  } else {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      img = require(`public/images/installations/png/${id}.png`).default;
      installationImgs[id] = { img };
    } catch (error) {
      // Mark: code block below was generating compile errors due to /installations/gif folder not existing
      // so removing for now as we work through what is causing the purple screen load issue
      img = DefaultInstallation;
      /*
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        img = require(`public/images/installations/gif/${id}.gif`).default;
        installationImgs[id] = { img };
        installationImgs[id].animated = true;
      } catch (error) {
        img = DefaultInstallation;
      }
      */
    }
  }
  return {
    bg: id < 10 ? BG_LE : BG_normal,
    img,
    animated: installationImgs[id]?.animated || false,
  };
};

const getTileDisplays = (id: number): { bg: string; img: string } => {
  let img;
  try {
    // Prefer colored LE art for recipe / inventory cards.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    img = require(`public/images/tiles/Tile_LE_${id}.png`).default;
  } catch {
    try {
      // Soft-launch greyscale bases (when no color sheet exists).
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      img = require(`public/images/tiles/greyscale/Tile_LE_${id}_base.png`).default;
    } catch {
      img = DefaultTlile;
    }
  }

  return {
    bg: BG_LE,
    img,
  };
};

const getSimpleSpriteGif = (pngName: string, folder: string): { img: string } => {
  let img;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    img = require(`public/animations/${folder}/${pngName}.gif`).default;
  } catch (error) {
    img = DefaultTlile;
  }

  return {
    img,
  };
};

export { BG_normal, BG_upgrade, getInstallationDisplays, getTileDisplays, getSimpleSpriteGif };
