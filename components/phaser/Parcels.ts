import _ from 'lodash';
import { GAME_CONFIG } from 'shared_code/constants/const.game';
import { getParcelIdData, getTileSizeByTypeId } from 'helpers/parcels.helper';
import { ParcelEvent } from 'types';
import { getParceIdByTokenId } from 'shared_code/utils/shared.utils.parcel';
import { getDefaultMaxZoomOut, getDefaultZoomRange } from 'helpers/phaser.helper';
import { scene } from 'components/controllers/SceneController';
import GlobalState from 'contexts/GlobalState';

// eslint-disable-next-line @typescript-eslint/no-var-requires

const paartnerData = [
  { tokenId: 487, image: 'ygg' },
  { tokenId: 1235, image: 'blackpool' },
  { tokenId: 3609, image: 'neon' },
  { tokenId: 3682, image: 'ordengg' },
  { tokenId: 5079, image: 'flamingo' },
  { tokenId: 13592, image: 'cgu' },
  { tokenId: 23881, image: 'readyplayerdao' },
  {
    tokenId: 25029,
    image: GlobalState.GAME?.state?.gameConfig.gotchiverseTheme || GAME_CONFIG.gotchiverseTheme === 'halloween' ? 'metaguild_halloween' : 'metaguild',
  },
  { tokenId: 40689, image: 'yggsea' },
];

// assign each tokenId the parcelId for easy reference.
_.map(paartnerData, (paartner) => {
  return _.assign(paartner, { parcelId: getParceIdByTokenId(paartner.tokenId) });
});

const create = (parcels: ParcelEvent[]): void => {
  parcels.forEach(({ id }: ParcelEvent) => createParcel(id));
};

const createParcel = (id: string): void => {
  if (!scene) return;
  // Check if the parcel is already loaded
  if (scene.spawnedParcelsByIdMap.has(id)) return;
  // Check if the parcels is owned in the future we will will owner prop sent from the server.
  const flag = _.find(
    GlobalState.REALM.state.ownedParcels,
    (p: { parcelId?: string; id?: string }) => p?.parcelId === id || p?.id === id,
  )
    ? 'owned'
    : 'unowned';
  const type = getParcelIdData(id).typeId;
  const isPaartner = _.find(paartnerData, ['parcelId', id]);
  // Each png has a 32px offset for the glow we need to subract that offset from final position
  const x = Number(id.split('-')[1]) * 64 - 32;
  const y = Number(id.split('-')[2]) * 64 - 32;
  // testing using native grid for parcels, looks like border stroke isn't showing up

  let { width, height } = getTileSizeByTypeId(type);
  width = width * 64;
  height = height * 64;

  const fillColor = flag === 'owned' ? 0xfa34f3 : 0x04b7bd;

  if (isPaartner) {
    scene.add
      .image(x + 32, y + 32, isPaartner.image)
      .setOrigin(0)
      .setAlpha(1)
      .setDepth(0);
  }
  if (!scene?.add) return;
  const grid = scene?.add
    .grid(x + 32, y + 32, width, height, 64, 64, fillColor, 0.05)
    .setOrigin(0)
    .setAlpha(1)
    .setDepth(1)
    .setFillStyle(fillColor, 0.05)
    .setData('owned', flag);
  if (!grid) return;
  if (scene.fadeLevel <= 0.05) {
    grid.setFillStyle(fillColor, 0.1);
    grid.setOutlineStyle(fillColor, 0.1);
  } else {
    grid.setFillStyle(fillColor, 0.05);
    grid.setOutlineStyle(fillColor, 0.5);
  }

  // add in stroke
  const graphics = scene.add.graphics();
  graphics.lineStyle(4, fillColor, 1);
  graphics.strokeRect(x + 32, y + 32, width, height);

  scene.spawnedParcelsByIdMap.set(id, grid);
};

//
/**
 * destroy a Parcel by removing it from the scene, used by AOI to garbage collect scenes as players move to the next AOI
 * @param item Item
 * */
const destroy = (parcels: ParcelEvent[]): void => {
  _.each(parcels, (parcel) => {
    if (scene.spawnedParcelsByIdMap.has(parcel.id)) {
      scene.spawnedParcelsByIdMap.get(parcel.id).destroy();
      scene.spawnedParcelsByIdMap.delete(parcel.id);
    }
  });
};

const fadeOut = (fadeValue: number): void => {
  scene.fadeLevel = (fadeValue - getDefaultMaxZoomOut()) / getDefaultZoomRange();

  scene.spawnedParcelsByIdMap.forEach((parcel) => {
    const owned = parcel.getData('owned');
    const fillColor = owned === 'owned' ? 0xfa34f3 : 0x04b7bd;

    if (scene.fadeLevel <= 0.05) {
      parcel.setFillStyle(fillColor, 0.1);
      parcel.setOutlineStyle(fillColor, 0.1);
    } else {
      parcel.setFillStyle(fillColor, 0.05);
      parcel.setOutlineStyle(fillColor, 0.5);
    }
  });
};

const destroyAll = (parcels: ParcelEvent[]) => {
  scene.spawnedParcelsByIdMap.forEach((parcel) => {
    parcel.destroy();
  });
  scene.spawnedParcelsByIdMap = new Map();
};

const Parcels = {
  create,
  fadeOut,
  destroy,
  destroyAll,
};

export default Parcels;
