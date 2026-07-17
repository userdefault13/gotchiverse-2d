/* eslint-disable no-trailing-spaces */
import SFXController from 'components/controllers/SFXController';
import {
  batchEquipOnParcel,
  equipUnequipOnParcel,
  formatTimeLeft,
  getParcelAccessRights,
  getParcelPositionById,
  getParcelsAccessRightsWhitelistIds,
  moveOnParcel,
  transformParcelFormat,
  secondsUntilParcelCanChannel,
  getParcelDataById,
} from 'helpers/parcels.helper';
import {
  Vector2,
  InstallationMetadata,
  Id,
  GotchiverseParcel,
  InstallationIdData,
  Tokens,
  InstallationTypeLocal,
  EquipUnequipContract,
  MoveContract,
  EquipUnequipMoveData,
  CreateInstallationOptions,
  BatchEquipContract,
  InstallationIdNFT,
  ParcelAccessRightsWhitelists,
  Parcel,
} from '../../types';

import Players from './Players';
import _ from 'lodash';
import AnimationsController from 'components/controllers/animationsController';
import {
  createInstallationIdByData,
  fetchContractGrid,
  getInstallationIdDataById,
  getInstallationIdsbyGrid,
  getUserUpgradeQueue,
} from 'shared_code/utils/shared.utils.installations';
import { showTransactionNotification, updateTransactionNotificationStatus } from 'contexts/NotificationContext/actions';
import { createContainer, dragMap, focusParcel, showStarfield, toggleFollowGotchi } from 'helpers/phaser.helper';
import { GOTCHI_SIZE } from 'shared_code/constants/const.game';
import { getContract } from 'web3/contract';
import GameController from 'components/controllers/GameController';
import { capitalizeFirstLetter } from 'helpers/functions';

import {
  borrowerCanAccess,
  borrowerCanBuild,
  getActiveParcelAaltarId,
  getAaltarIdForInstallation,
  getActiveParcelByTokenId,
  getActiveParcelCollision,
  getAllDataById,
  getGlobalInstallationPosition,
  getLocalInstallationsByParcelId,
  getLocalInventoryItem,
  getLocalUpgrade,
  getMaakerByParcelId,
  getQueueIds,
  getRelativePositionToParcel,
  getRoundPoiterPosition,
  getSelectedGotchiId,
  getTypeById,
  isAaltar,
  isDecoration,
  isInstallation,
  isOverlap,
  isOwnedById,
  isUpgradable,
  isUpgrading,
  setLocalInventory,
} from 'helpers/installations.helper';

import { NFTDisplay } from './NFTDisplay';
import { getErrMessage } from 'helpers/ethers.helper';
import { PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';
import Parcels from './Parcels';
import GlobalState from 'contexts/GlobalState';
import InputController from 'components/controllers/inputController';
import { scene } from 'components/controllers/SceneController';
import { fetchSubgraphParcelOwner } from 'shared_code/utils/shared.utils.parcel';
import { throttleZoomResize } from './scenes/gameScene';
import { isColyseusNetcode } from 'helpers/colyseus.client';
import { postFocusStatus } from 'contexts/UIContexts/actions';
import AssetsController from 'components/controllers/assetsController';

const uiContainers: { marker? } = {};
// let markerBtnContainer = null;
const USE_DUMMY = false;

interface InstallationInterface {
  isActive: boolean;
  buildModeState: boolean;
  createByIds: (ids: Id[], options?: CreateInstallationOptions) => Promise<void>;
  toggleBrush: (installation?: InstallationTypeLocal) => void;
  updateBuildMarkerPosition: (pointer) => void;
  handleEquipUnequipMove: (installation: EquipUnequipMoveData, callMethod: 'equip' | 'unequip' | 'move') => void;
  destroyAll: () => void;
  destroyByIds: (ids, isWaiting?: boolean) => void;
  toggleBuildMode: (state: boolean, fetchGrid?: boolean) => Promise<boolean | string>;
  setActiveInstallation: (id?: string) => Promise<boolean>;
  updateParcelLastChannel: (id: string, parcelLastChanneled: string) => void;
  addFlamesToAaltar: (id: string, state: boolean) => void;
  placeInstallation: () => void;
  handleSpillOverAnim: (id: string, type?: Tokens) => void;
  handleBatchEquip: () => void;
  updatePlaceQueue: (id: string, action: 'EQUIP' | 'UNEQUIP' | 'CANCEL') => void;
  resetStates: () => void;
}

// Create Destroy by ID
const createByIds = async (ids: InstallationIdNFT[], options?: CreateInstallationOptions): Promise<void> => {
  if (!ids?.length || !scene?.installationGroup) return;

  await Promise.all(
    ids.map(async ({ id, nft }) => {
      try {
        if (!options?.isWaiting && scene.installationGroup.has(id) && !options?.isMove) return;

        const installationData = await getAllDataById(id);

        if (!installationData) return;
        // destroy and replace waiting installations

        if (!options?.isWaiting && scene.installationsWaiting.has(id)) {
          destroyByIds([{ id }], true);
          if (!options?.isMove) handleEquipFX(installationData);
        }

        // destroy upgrade on sync
        if (options?.isWaiting && !options?.isMove) {
          const upgrade = getLocalUpgrade(id);
          if (upgrade) destroyByIds([{ id: upgrade }]);
        }

        const installation = await spawnSprite(installationData, options);
        if (!installation) return;
        if (installationData.typeData.type === 'INSTALLATION') SFXController.handleEquipSounds(id, installation.x, installation.y);
        options?.isWaiting ? scene.installationsWaiting.set(id, installation) : scene.installationGroup.set(id, installation);
        checkInstallationAnimations(id, true);

        if (installationData.typeData.installationType === 5) {
          // NFTDIsplay
          await NFTDisplay.displayPhaserImage(nft, id);
        }
      } catch (e) {
        console.warn('createByIds failed for', id, e);
      }
    }),
  );
};

const spawnSprite = async (installationData: InstallationMetadata, options?: CreateInstallationOptions) => {
  const { id, globalPosition, state, typeData, spriteMetadata } = installationData;
  const { type, width, height, itemId, level, installationType } = typeData;
  const { key, frame, animationsCount, pngName, jsonData } = spriteMetadata;
  const installationContainer = scene.add.container(
    globalPosition.x + (width * GOTCHI_SIZE.UNIT) / 2,
    globalPosition.y + (height * GOTCHI_SIZE.UNIT) / 2,
  );

  installationContainer.setSize(width * GOTCHI_SIZE.UNIT, height * GOTCHI_SIZE.UNIT);

  let installationImage;
  if (type === 'INSTALLATION') {
    // Dynamic load may not have queued this sheet yet — ensure texture exists before spawn.
    if (key) await AssetsController.checkLocalTexture(key);
    const offset = { x: jsonData?.offset?.x || 0, y: jsonData?.offset?.y || 0 };
    installationImage = scene.add
      .sprite((-width * GOTCHI_SIZE.UNIT) / 2 + offset.x, (-height * GOTCHI_SIZE.UNIT) / 2 + offset.y, key, frame)
      .setOrigin(0);
  } else {
    installationImage = await scene.dynamicAdd.image(0, 0, `Tile_LE_${itemId || 1}`, 0);
    installationImage.setOrigin(0.5).setAlpha(0.9);
    installationImage.displayWidth = width * GOTCHI_SIZE.UNIT;
    installationImage.displayHeight = height * GOTCHI_SIZE.UNIT;
    installationImage.width = width * GOTCHI_SIZE.UNIT;
    installationImage.height = height * GOTCHI_SIZE.UNIT;
    // set this filter mod NEAREST if pixelArt is disabled, to have the same effect on a sprite level
    // installationImage.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  if (installationContainer.getByName('sprite') === null) {
    installationImage.setName('sprite');
    installationContainer.add(installationImage);
  }

  installationContainer
    .setDepth(type === 'INSTALLATION' ? (installationData.typeData.installationType === 5 ? 102 : 202 + installationData.position.y) : 8)
    .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' })
    .setDataEnabled();

  if (options?.isPendingRemove) installationContainer.data.set('pendingRemove', true);

  if (id) {
    // if it has no id means it's coming from buildMarker
    installationContainer.data.set('id', id);

    if (animationsCount && GlobalState.SETTINGS.state.allowInstallationAnimations) {
      if (isAaltar(id) || isDecoration(id)) AnimationsController.play(installationImage, pngName);
      else {
        AnimationsController.play(installationImage, `${key}_${level}`);
      }
    }
  }

  if (state) {
    const upgradingImage = scene.add
      .sprite(-width * 32, -height * 32, 'action_upgrade', 0)
      .setOrigin(0, 0.5)
      .setAlpha(0.5);
    if (GlobalState.SETTINGS.state.allowInstallationAnimations) {
      AnimationsController.play(upgradingImage, 'action_upgrade');
    }
    installationContainer.add(upgradingImage);
  }

  // opacity and buttons
  if (options?.isWaiting) {
    // set a dummy installation image until we receive the server event;
    installationImage.setAlpha(0.8);
    AnimationsController.tweenOpacity(installationImage, 1200);
  } else {
    // check owner, create channelingContainer & buildModeUI only if parcel is owned;
    if (id) {
      // if it has no id means it's coming from buildMarker
      const parcel = isOwnedById(id);
      if (parcel) {
        // check if installation is aaltar
        if (installationType === 0) {
          // Missing subgraph field → treat as never channeled so the ready icon still appears.
          createAaltarChannelContainer(id, installationContainer, parcel.lastChanneledAlchemica ?? 0);
          // upgrade installation, close UI etc
        }
        createInstallationBuildModeUI(installationContainer);
      } else if (isAaltar(id) || installationType === 8) createInstallationBuildModeUI(installationContainer); // create container if is aaltar
    }
  }

  if (options?.isBatch) {
    const cancelBtn = scene.add
      .image(globalPosition.x + width * GOTCHI_SIZE.UNIT, globalPosition.y, 'xBtn')
      .setOrigin(0.7, 0.45)
      .setDepth(500)
      .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' })
      .on(
        'pointerdown',
        () => {
          if (scene.marker) return; // don't trigger if we have a 'brush' selected
          SFXController.playFX('click');
          updatePlaceQueue(id, 'CANCEL');
        },
        this,
      );
    // add to global ui containers to have depth on it
    uiContainers[`${id}-cancel`] = cancelBtn;
  }

  // add tint
  if (options?.tintType) {
    installationImage.setTint(...scene.tints[options.tintType.toLocaleLowerCase()]);
  }
  return installationContainer;
};

const createInstallationBuildModeUI = (installationContainer) => {
  if (installationContainer.getByName('buttonsContainer')) {
    return;
  }
  const offset = installationContainer.height / 2 + 35;
  const offsetL2 = offset - 42;
  const id = installationContainer.data.get('id');
  const sprite = installationContainer.getByName('sprite');
  let upgradeBtn, moveBtn;

  // CONTAINER CREATE
  const buttonContainer = createContainer(140, 64);
  buttonContainer
    .setName('buttonsContainer')
    .setPosition(installationContainer.x, installationContainer.y + offset)
    .setDepth(installationContainer.depth + installationContainer.y);
  uiContainers[id] = buttonContainer;

  // UPGRADE BTN
  if (isUpgradable(id)) {
    upgradeBtn = scene.add
      .image(0, 0, isUpgrading(id) ? 'upgradeBtn' : 'upgradeBtnIcon')
      .setOrigin(0.5)
      .setName('upgradeBtn')
      .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' })
      .on(
        'pointerdown',
        () => {
          SFXController.playFX('click');
          GlobalState.UI.dispatch({ type: 'UPDATE_UPGRADE_MODAL', upgradeModal: { open: true, installationId: id } });
          removeInstallationBuildModeUI(installationContainer);
        },
        this,
      );
    buttonContainer.add(upgradeBtn);
    Phaser.Display.Align.To.BottomCenter(upgradeBtn, sprite, 0, -offset);
    if (isUpgrading(id)) Phaser.Display.Align.To.BottomCenter(upgradeBtn, sprite, -20, -offset);
  }
  const idData = getInstallationIdDataById(id);

  // Remove BTN
  const removeBtn = scene.add.image(0, 0, 'removeBtn');
  removeBtn.displayWidth = 40;
  removeBtn.displayHeight = 40;
  removeBtn
    .setOrigin(0.5, 0)
    .setName('removeBtn')
    .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' })
    .on(
      'pointerdown',
      () => {
        SFXController.playFX('click');
        if (idData.type === 'TILE') Installations.updatePlaceQueue(id, 'UNEQUIP');
        else GlobalState.UI.dispatch({ type: 'UPDATE_UNEQUIP_MODAL', unequipModal: { open: true, installationId: id } });
        removeInstallationBuildModeUI(installationContainer);
      },
      this,
    );
  buttonContainer.add(removeBtn);
  Phaser.Display.Align.To.BottomCenter(removeBtn, sprite, 50, isUpgrading(id) || isDecoration(id) || !isInstallation(id) ? -offset : -offsetL2);

  // MOVE BTN
  if (!isUpgrading(id)) {
    moveBtn = scene.add.image(0, 0, 'moveBtn');
    moveBtn.displayHeight = 40;
    moveBtn
      .setOrigin(0.5)
      .setName('moveBtn')
      .setInteractive({ cursor: 'url(/cursors/pointer.png), auto' })
      .on(
        'pointerdown',
        async () => {
          await handleMove(id, installationContainer);
        },
        this,
      );
    buttonContainer.add(moveBtn);
    Phaser.Display.Align.To.BottomCenter(moveBtn, sprite, -20, isUpgrading(id) || isDecoration(id) || !isInstallation(id) ? -offset : -offsetL2);
  }

  buttonContainer.setVisible(false);

  // TOGGLE ACTIVE
  installationContainer.on('pointerdown', async () => {
    const activeId = scene.activeInstallation?.data?.get('id');
    const installationId = installationContainer?.data?.get('id');

    void setActiveInstallation();

    if (!Installations.buildModeState) {
      const installationType = getTypeById(installationId);
      // console.log('installationType:', installationType);
      if (installationType?.installationType !== 8 && (!isUpgradable(id) || installationType?.installationType === 5)) {
        resetStates();
        return;
      }
    }
    if (activeId === id) return;

    // setActiveInstallatino will also check parcel access rights!
    const isActive = await setActiveInstallation(id);
    if (!isActive) {
      // Installation is not owned
      console.log(`Installation:${id}, not owned!`);
      handleUnownedInterractions(id);
      return;
    }

    if (scene.marker?.data?.get('id') !== installationId) SFXController.playFX('click');
    // console.log('isActive', scene.activeInstallation.data.list, scene.activeRealmId);
    if (Installations.buildModeState) {
      // console.log('BUILDMODE ', scene.activeInstallation.data.list, scene.activeRealmId);
      if (upgradeBtn) upgradeBtn.setVisible(true);
      if (moveBtn) moveBtn.setVisible(true);
      Phaser.Display.Align.To.BottomCenter(removeBtn, sprite, 50, isUpgrading(id) || isDecoration(id) || !isInstallation(id) ? -offset : -offsetL2);

      // if we have items in the queue show only the remove btn;
      if (scene.batchQueue.length) {
        if (!uiContainers[id]) return;
        if (upgradeBtn) upgradeBtn.setVisible(false);
        if (moveBtn) moveBtn.setVisible(false);

        if (removeBtn && !isUpgrading(id)) Phaser.Display.Align.To.BottomCenter(removeBtn, sprite, 0, -offset);
        else {
          removeBtn?.setVisible(false);
        }
      }
      uiContainers[id]?.setVisible(true);
    } else {
      if (isAaltar(id)) {
        calculateChannelState(id, scene.activeInstallation, getActiveParcelByTokenId(scene.activeRealmId)?.lastChanneledAlchemica);
      }
      handleOwnedInterraction();
      const parcelId = getInstallationIdDataById(id).parcelId;
      await setActiveParcel(false, parcelId);
      console.log('GAMEMODE', scene.activeInstallation?.data?.list, scene.activeRealmId, scene.activeParcel);
    }
  });
};

const handleUnownedInterractions = (id: string) => {
  const type = getTypeById(id);

  switch (type.installationType) {
    // case 0:
    //   // AALTAR
    //
    //   break;

    // case 1:
    //   // HARVESTER
    //
    //   break;

    // case 2:
    //   // RESERVOIR
    //
    //   break;

    // case 6:
    //   // MAAKER
    //
    //   break;

    case 8:
      // BOUNCE GAATE
      handleBounceGaate(id);
      break;

    default:
      break;
  }
};

const handleOwnedInterraction = () => {
  if (scene.disableKeyboard || !scene.activeRealmId || !scene.activeInstallation) return;
  const activeInstallationId = scene.activeInstallation.getData('id');
  const type = getTypeById(activeInstallationId);

  console.log('INTERACT', activeInstallationId, type);

  switch (type.installationType) {
    case 0:
      if (Players.selectedPlayer?.isSpectator) return;
      // AALTAR
      GlobalState.UI.dispatch({
        type: 'UPDATE_PARCEL_DASHBOARD',
        parcelDashboardState: { open: true, altarId: activeInstallationId },
      });
      break;

    case 1:
      // HARVESTER
      GlobalState.UI.dispatch({
        type: 'UPDATE_HARVESTER_STATE',
        harvesterState: {
          open: true,
          installationId: activeInstallationId,
          aaltarId: getActiveParcelAaltarId(scene.activeParcel) || getAaltarIdForInstallation(activeInstallationId),
        },
      });
      break;

    case 2:
      // RESERVOIR
      GlobalState.UI.dispatch({
        type: 'UPDATE_RESERVOIR_STATE',
        reservoirState: {
          open: true,
          installationId: activeInstallationId,
          aaltarId: getActiveParcelAaltarId(scene.activeParcel) || getAaltarIdForInstallation(activeInstallationId),
        },
      });
      break;

    case 6:
      // MAAKER
      GlobalState.UI.dispatch({
        type: 'UPDATE_MAAKER_MODAL',
        maakerModal: { open: true, installationId: activeInstallationId },
      });
      break;

    case 8:
      // BOUNCE GAATE
      handleBounceGaate(activeInstallationId);
      break;

    default:
      break;
  }
};

const handleBounceGaate = (id: string): void => {
  if (Installations.buildModeState) return;
  toggleFocus(id, true);
  InputController.updateDisableKeyboard(true);
  setTimeout(() => {
    if (!scene) return;
    GlobalState.UI.dispatch({
      type: 'UPDATE_EVENT_HOLOGRAM',
      eventHologramState: {
        open: true,
        installationId: id,
      },
    });
  }, 500);
};

const handleMove = async (id: string, container) => {
  // console.log('HANDLE MOVE:', id, container, scene.activeParcel);
  SFXController.playFX('click');
  void setActiveInstallation();
  scene.buildInstallation = await getAllDataById(id);
  scene.buildInstallation.isMoving = id;
  scene.marker = container;
  removeInstallationBuildModeUI(container);
  setMarkerInteractives(true);
  updateGridById(id);
  createByIds([{ id }], { isWaiting: true, isMove: true });
  setTimeout(() => {
    Installations.isActive = true;
  }, 100);
};

const updateGridById = (id: string) => {
  if (!scene.activeParcel?.grid || !scene.activeParcel.tileGrid) return;
  const { itemId, position, type } = getInstallationIdDataById(id);
  const { width, height } = getTypeById(id);

  const grid = [...(type === 'INSTALLATION' ? scene.activeParcel.grid : scene.activeParcel.tileGrid)];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      grid[position.y + y][position.x + x] = grid[position.y + y][position.x + x] === itemId ? 0 : itemId;
    }
  }
  // console.log('updatedGrid', grid);
};

const removeInstallationBuildModeUI = (installationContainer) => {
  if (!installationContainer?.data) return;
  // const buttonContainer = installationContainer?.getByName('buttonsContainer');
  const id = installationContainer.data.get('id');
  const buttonContainer = uiContainers[id];
  if (buttonContainer) {
    buttonContainer.setVisible(false);
  }
  if (scene.activeInstallation) {
    void setActiveInstallation();
  }
};

const createAaltarChannelContainer = (id: string, installationContainer, lastChanneledAlchemica) => {
  // `0` / `"0"` means never channeled — still show the ready icon.
  if (!id || !installationContainer || lastChanneledAlchemica == null || lastChanneledAlchemica === '') return;

  const oldChannelingContainer = installationContainer.getByName('channelingContainer');
  const oldChannelLight = installationContainer.getByName('channelState');

  if (oldChannelingContainer) oldChannelingContainer.destroy();
  if (oldChannelLight) oldChannelLight.destroy();

  const channelingContainer = createContainer(100, 32);
  channelingContainer.setName('channelingContainer').setPosition(0, 42);

  const channelIcon = scene.add.image(0, 0, 'channelIcon').setName('channelIcon');
  const channelIconMain = scene.add.image(0, 0, 'channelIconMain').setName('channelIconMain');
  const channelState = scene.add
    .pointlight(0, 0, ...scene.tints.active, 150, 0.5, 0.075)
    .setName('channelState')
    .setVisible(false);
  const countDownText = scene.add.text(0, 0, '', {
    fontFamily: 'Pixelar',
    fontSize: '20px',
    color: '#ffffff',
    align: 'center',
  });

  countDownText.setName('countdown').setStroke('0x000000', 4);

  channelingContainer.add(channelIcon);
  channelingContainer.add(channelIconMain);
  channelingContainer.add(countDownText);

  installationContainer.add(channelState);
  installationContainer.add(channelState).moveTo(channelState, 0);

  installationContainer.add(channelingContainer);
  calculateChannelState(id, installationContainer, lastChanneledAlchemica);
};

// Used in create and destroy by id to manage animations based on installation types
const checkInstallationAnimations = (id: string, state: boolean) => {
  const idData = getInstallationIdDataById(id);
  const installationType = getTypeById(id);
  if (state) {
    if (installationType.installationType === 6) {
      setTimeout(() => {
        handleMaakerAnim(id);
      }, 100);
    }

    if (idData.state === 1) {
      setTimeout(() => {
        const maakerId = getMaakerByParcelId(idData.parcelId);
        // console.log('maakerId', maakerId);
        handleMaakerAnim(maakerId, id);
      }, 1000);
    }
  } else {
    if (idData?.state) {
      setTimeout(() => {
        // delay to account for missing base
        const maakerBot = scene.maakerBotsGroup.get(`${id}`);
        if (!maakerBot) return;
        const parentId = maakerBot.getData('parentId');
        createBotTrajectory(maakerBot, parentId, 'receive');
      }, 100);
    }
  }
};

const destroyByIds = (ids, isWaiting?: boolean) => {
  // console.log('destroyByIds', ids);
  const activeId = scene.activeInstallation?.data?.get('id');
  _.each(ids, ({ id }) => {
    const group = isWaiting ? scene.installationsWaiting : scene.installationGroup;
    if (group.has(id)) {
      if (activeId && activeId === id) void setActiveInstallation();
      // ? remove audios from list
      destroyAudios(id);

      if (!isWaiting) {
        uiContainers[id]?.destroy();
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete uiContainers[id];
      } else {
        uiContainers[`${id}-cancel`]?.destroy();
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete uiContainers[`${id}-cancel`];
      }

      group.get(id)?.destroy();
      group.delete(id);

      checkInstallationAnimations(id, false);
    }
  });
};

const destroyAudios = (id: string) => {
  const type = getTypeById(id);
  const installation = scene.installationGroup.get(id);
  if (type?.installationType === 6) {
    destroyMaakerBots(id);
  }
  const spatialKey = installation?.getData('spatial');
  if (spatialKey) SFXController.setSpatialAudios({ id, key: spatialKey, x: installation.x, y: installation.y }, false);
};

const destroyAll = () => {
  if (scene.installationGroup) {
    scene.installationGroup.forEach((installation) => installation.destroy());
    scene.installationGroup = new Map();
  }
};

// BUILD MARKER & EQUIPING (used for equiping on parcel and move installations)
const setMarkerInteractives = (displayButtons?: true) => {
  if (!scene?.marker) return;
  scene.marker.setInteractive();
  addMarkerColor(0x63f323);
  scene.marker.on('pointerdown', () => {
    Installations.isActive = true;
  });
  scene.marker.setDepth(scene.buildInstallation.typeData.type === 'INSTALLATION' ? 100 : 10);

  if (displayButtons) {
    // ui container for marker
    const warningContainer = createContainer(140, 64);
    warningContainer.setName('warningContainer').setPosition(0, 55);
    const text = scene.add.text(0, 0, "CAN'T PLACE\nOUTSIDE THE PARCEL", {
      fontFamily: 'Pixelar',
      fontSize: '24px',
      color: '#ff0000',
      align: 'center',
    });
    text.setName('warning').setStroke('0x000000', 4).setOrigin(0.5).setVisible(false);
    warningContainer.add(text);

    Phaser.Display.Align.In.BottomCenter(text, warningContainer, 0, 0);

    // equip btn and close button container
    const markerBtnContainer = createContainer(140, 64);
    markerBtnContainer.setDepth(500).setName('markerUi');

    const markerEquipBtn = scene.add.image(0, 0, 'equipBtn').setName('equipBtn');
    markerEquipBtn.setInteractive({ cursor: 'url(/cursors/pointer.png), auto' });

    const markerCloseBtn = scene.add.image(0, 0, 'closeBtn').setName('closeBtn');
    markerCloseBtn.setInteractive({ cursor: 'url(/cursors/pointer.png), auto' });

    markerEquipBtn.on('pointerdown', async () => {
      const equipData: EquipUnequipMoveData = {
        itemId: scene.buildInstallation.typeData.itemId,
        type: scene.buildInstallation.typeData.type,
        realmId: scene.buildInstallation.realmId,
        relativePosition: scene.buildInstallation.relativePosition,
        isMoving: scene.buildInstallation.isMoving,
      };
      await handleEquipUnequipMove(equipData, scene.buildInstallation.isMoving ? 'move' : 'equip');
    });

    markerCloseBtn.on('pointerdown', () => {
      if (scene.buildInstallation.isMoving) {
        createByIds([{ id: scene.buildInstallation.isMoving }], { isMove: true });
      }
      destroyMarker(true);
    });

    markerBtnContainer.add(markerCloseBtn);
    markerBtnContainer.add(markerEquipBtn);
    markerBtnContainer.add(warningContainer);

    Phaser.Display.Align.To.BottomCenter(markerEquipBtn, markerBtnContainer, -20, -50);
    Phaser.Display.Align.To.BottomCenter(markerCloseBtn, markerBtnContainer, 50, -50);
    Phaser.Display.Align.To.TopCenter(warningContainer, markerBtnContainer, 0, -10);

    uiContainers.marker = markerBtnContainer;
    // markerBtnContainer.setVisible(false);
  }
};

const destroyMarker = (destroyBuildInstallation?: boolean) => {
  if (scene.marker) {
    scene.marker.destroy();
    uiContainers.marker?.destroy();
    uiContainers.marker = null;
    delete scene.marker;
  }
  if (destroyBuildInstallation) scene.buildInstallation = undefined;
};

const updateBuildMarkerPosition = (pointer: Phaser.Input.Pointer) => {
  if (scene.marker && scene.activeParcel && scene.buildInstallation) {
    dragMap(false);
    const position = getRoundPoiterPosition({ x: pointer.worldX, y: pointer.worldY });
    scene.marker.setPosition(position.x + scene.marker.width / 2, position.y + scene.marker.height / 2);
    const offsetY = scene.marker.height / 2 + 25;
    if (uiContainers.marker) uiContainers.marker.setPosition(scene.marker.x, scene.marker.y + offsetY);

    const relativePosition = getRelativePositionToParcel(scene.activeParcel, position);
    _.assign(scene.buildInstallation, { position, relativePosition });

    const grid = scene.buildInstallation.typeData.type === 'INSTALLATION' ? scene.activeParcel.grid : scene.activeParcel.tileGrid;

    isOverlap(grid, relativePosition, {
      width: Number(scene.buildInstallation.typeData.width),
      height: Number(scene.buildInstallation.typeData.height),
    }) ||
    (!getLocalInventoryItem(scene.buildInstallation.typeData.itemId, scene.buildInstallation.typeData.type)?.quantity &&
      !scene.buildInstallation.isMoving)
      ? addMarkerColor(0xff4f78, true)
      : addMarkerColor(0x63f323);
  }
};

const addMarkerColor = (color: number, isTint = false) => {
  if (scene.marker) {
    const image = scene.marker.getByName('sprite') as Phaser.GameObjects.Image;
    if (scene.outLinePlugin && image) {
      scene.outLinePlugin?.remove(image);
      scene.outLinePlugin?.add(image, { thickness: 4.5, outlineColor: color });
    }
    isTint ? image.setTint(...scene.tints.unequip) : image.clearTint();
  }
};

// Toggles active installation for buildMode to enable dragging
const toggleBrush = async (installation?: InstallationTypeLocal) => {
  void setActiveInstallation();
  Installations.isActive = !!installation;
  if (Installations.isActive && scene.activeParcel && installation) {
    // create fake installation ID to be able to use spawnSprite.
    const installationId = createInstallationIdByData({
      parcelId: scene.activeParcel.id,
      itemId: installation.itemId,
      x: 50, // just outside of the view
      y: 50,
      type: installation.type === 'INSTALLATION' ? '0' : '1',
      state: 0,
    });

    scene.buildInstallation = await getAllDataById(installationId);
    destroyMarker();
    scene.marker = await spawnSprite(scene.buildInstallation);
    setMarkerInteractives();
  } else {
    if (scene.buildInstallation?.isMoving) {
      createByIds([{ id: scene.buildInstallation.isMoving }], { isMove: true });
    }
    destroyMarker(true);
  }
};

// external function, place installation after drag for equip and move
const placeInstallation = () => {
  // console.log('placeInstallation...', scene.buildInstallation);
  if (!scene.buildInstallation) return;
  const grid = scene.buildInstallation.typeData.type === 'INSTALLATION' ? scene.activeParcel.grid : scene.activeParcel.tileGrid;
  if (
    scene.marker &&
    !isOverlap(grid, scene.buildInstallation.relativePosition, {
      width: Number(scene.buildInstallation.typeData.width),
      height: Number(scene.buildInstallation.typeData.height),
    }) &&
    getLocalInventoryItem(scene.buildInstallation.typeData.itemId, scene.buildInstallation.typeData.type)?.quantity &&
    !scene.buildInstallation.isMoving
  ) {
    const installationId = createInstallationIdByData({
      parcelId: scene.activeParcel.id,
      itemId: scene.buildInstallation.typeData.itemId,
      x: scene.buildInstallation.relativePosition.x,
      y: scene.buildInstallation.relativePosition.y,
      type: scene.buildInstallation.typeData.type === 'INSTALLATION' ? '0' : '1',
      state: 0,
    });
    if (!scene.buildInstallation.isMoving) updatePlaceQueue(installationId, 'EQUIP');
    dragMap(true);
    SFXController.playFX('click');
  } else {
    if (!scene.buildInstallation.isMoving) SFXController.playFX('oops');
  }
  if (scene.buildInstallation.isMoving) {
    uiContainers.marker.setVisible(true);
    Installations.isActive = false;
  }
};

const updatePlaceQueue = (id: string, action: 'EQUIP' | 'UNEQUIP' | 'CANCEL') => {
  const isntallationData = getInstallationIdDataById(id) as unknown as InstallationIdData;
  switch (action) {
    case 'EQUIP':
      createByIds([{ id }], { isWaiting: true, isMove: true, isBatch: true, tintType: 'EQUIP' });
      updateGridById(id);
      setLocalInventory(isntallationData.itemId, isntallationData.type, -1);
      // disable activeBrush if no quantity
      scene.batchQueue = _.concat(scene.batchQueue, [{ id, action }]);
      break;
    case 'UNEQUIP':
      createByIds([{ id }], { isWaiting: true, isMove: true, isBatch: true, tintType: 'UNEQUIP' });
      destroyByIds([{ id }]);
      scene.batchQueue = _.concat(scene.batchQueue, [{ id, action }]);
      break;
    case 'CANCEL':
      destroyByIds([{ id }], true);
      if (_.find(scene.batchQueue, (item) => item.id === id)?.action === 'EQUIP') {
        updateGridById(id);
        setLocalInventory(isntallationData.itemId, isntallationData.type, 1);
      }
      if (_.find(scene.batchQueue, (item) => item.id === id)?.action === 'UNEQUIP') {
        createByIds([{ id }]);
      }
      _.remove(scene.batchQueue, (item) => {
        return item.id === id;
      });
      break;

    default:
      break;
  }
  // console.log('scene.batchQueue', scene.batchQueue);
};

// INTERACT installation (channeling etc)
/** Clear build-mode-only visuals so installs look normal in play mode. */
const normalizePlayModeInstallations = () => {
  if (!scene) return;

  // Hide every build-mode button tray (not only the active install).
  Object.keys(uiContainers).forEach((key) => {
    if (key === 'marker') return;
    uiContainers[key]?.setVisible?.(false);
  });

  scene.installationGroup?.forEach((container) => {
    const sprite = container?.getByName?.('sprite');
    if (sprite) {
      scene.tweens?.killTweensOf?.(sprite);
      if (typeof sprite.setAlpha === 'function') sprite.setAlpha(1);
    }
  });
};

const toggleBuildMode = async (state: boolean): Promise<boolean | string> => {
  throttleZoomResize();
  scene.scale.resize(scene.scale.gameSize.width, scene.scale.gameSize.height);
  scene.scale.setGameSize(scene.scale.gameSize.width, scene.scale.gameSize.height);
  if (!state && scene) {
    if (scene.batchQueue.length) {
      // need to recreate the initial items
      const restore = scene.batchQueue.filter((item) => item.action === 'UNEQUIP').map((item) => ({ id: item.id }));
      destroyByIds(scene.batchQueue, true);
      if (restore.length) await createByIds(restore);
    }

    // Promote non-batch waiting placeholders into normal play-mode installs.
    // Colyseus build mode used to leave these stuck in installationsWaiting.
    if (scene.installationsWaiting?.size) {
      const batchIds = new Set((scene.batchQueue || []).map((item) => item.id));
      const promote: Array<{ id: string }> = [];
      scene.installationsWaiting.forEach((_sprite, id: string) => {
        if (!batchIds.has(id)) promote.push({ id });
      });
      if (promote.length) {
        destroyByIds(promote, true);
        await createByIds(promote);
      }
    }

    void toggleBrush();
    showStarfield(true);

    if (scene.activeParcel) {
      scene.activeParcel = undefined;
      toggleFollowGotchi(true);
    }

    Installations.buildModeState = false;
    removeInstallationBuildModeUI(scene.activeInstallation);
    // add back channelContainers (copy ids — setChannelContainerState mutates the array)
    const channelIds = [...(scene.buildModeInstallations || [])];
    _.each(channelIds, (id) => setChannelContainerState(id, true));
    scene.batchQueue = [];
    scene.buildModeInstallations = [];
    normalizePlayModeInstallations();
    GlobalState.UI.dispatch({
      type: 'UPDATE_HUD',
      hud: 'PLAY',
    });
    GlobalState.UI.dispatch({
      type: 'UPDATE_INMENU',
      inMenu: false,
    });
    if (GlobalState.UI.dispatch) {
      postFocusStatus(true, GlobalState.UI.dispatch);
    }
    InputController.updateDisableKeyboard(false);
    return false;
  } else {
    Installations.buildModeState = true;
    const active = await setActiveParcel(true);
    if (active && scene.activeParcel) {
      focusParcel(scene.activeParcel);
      if (scene.activeParcel.installations?.length) {
        // test local installation sapawns, if installations are not there we need to resync.
        let inSync = true;
        const colyseus = isColyseusNetcode();
        const missing: Array<{ id: string }> = [];

        scene.activeParcel.installations.forEach((id) => {
          if (!scene.installationGroup.has(id)) {
            console.log(`Installations out of sync  ${id}`);
            inSync = false;
            missing.push({ id });
          } else if (scene.installationGroup.has(id)) {
            setChannelContainerState(id, false);
          }
        });

        if (missing.length) {
          // Colyseus has no legacy resync — spawn real installs, not waiting placeholders.
          await createByIds(missing, colyseus ? undefined : { isWaiting: true });
        }

        const onLocal = getLocalInstallationsByParcelId(scene.activeParcel.id);
        if (onLocal.length !== scene.activeParcel.installations?.length) inSync = false;

        if (!inSync && !colyseus) {
          console.log(`Parcel ${scene.activeParcel.id} is out of sync, including in the queue....`);
          GameController.sendData('installations', 'resync', scene.activeParcel.id);
        } else if (inSync) {
          console.log('All good here fren!');
        }
        console.log('PARCEL GRIDS', scene.activeParcel);
      } else {
        const onLocal = getLocalInstallationsByParcelId(scene.activeParcel.id);
        if (onLocal?.length && !isColyseusNetcode()) {
          GameController.sendData('installations', 'resync', scene.activeParcel.id);
          console.log('Resync no instalaltions');
        } else {
          console.log('All good here fren!');
        }
      }

      void setActiveInstallation();
      const canBuild = borrowerCanBuild(scene.activeParcel);

      return canBuild;
    }
  }
};

const toggleFocus = (id: string, state: boolean) => {
  // console.log('@toggleFocus:', id, state);
  if (state) {
    const pos = getGlobalInstallationPosition(id, true);
    // console.log('pos', pos);
    const mainCamera = scene?.cameras?.main;
    // console.log('mainCamera', mainCamera);
    mainCamera.pan(pos.x, pos.y, 500);
    toggleFollowGotchi(false);
  }
};

const setActiveParcel = async (fetchGrid: boolean, parcelId?: string): Promise<boolean | string> => {
  let localParcels = GlobalState.REALM?.state.ownedParcels;
  if (!parcelId) {
    // console.log('@setActiveParcel', localParcels);
    const player = scene[Players.selectedPlayer.id];
    const collisionParcel: Parcel = getActiveParcelCollision(localParcels, player, player);
    if (collisionParcel) {
      if (borrowerCanBuild(collisionParcel)) scene.activeParcel = collisionParcel;
    } else {
      fetchGrid = false;
      if (scene.lastParcelCollisionId) {
        await checkParcelAccessRights(scene.lastParcelCollisionId);
        localParcels = GlobalState.REALM?.state.ownedParcels;
        const collisionParcel = getActiveParcelCollision(localParcels, player, player);
        scene.activeParcel = collisionParcel;
      }
    }
  } else scene.activeParcel = localParcels.find((parcel) => parcel.id === parcelId);

  if (!scene.activeParcel) return;
  if (fetchGrid) {
    scene.activeParcel.installations = getLocalInstallationsByParcelId(parcelId);
    const realmDiamond = await getContract(GlobalState.WEB3.state.currentNetwork, GlobalState.WEB3.state.globalProvider);
    const installationDiamond = await getContract(
      GlobalState.WEB3.state.currentNetwork,
      GlobalState.WEB3.state.globalProvider,
      'installationDiamond',
    );

    const grid = await fetchContractGrid(
      realmDiamond,
      {
        type: scene.activeParcel.type,
        tokenId: scene.activeParcel.tokenId,
      },
      0,
    );

    const userUpgradeQueue = (await getUserUpgradeQueue(installationDiamond, GlobalState.WEB3.state.currentAccount)) || [];
    console.log('userUpgradeQueue', userUpgradeQueue);
    if (grid && scene.activeParcel) {
      _.assign(scene.activeParcel, { grid });
      // console.log('grid scene.activeParcel', scene.activeParcel);
      const queueIds = userUpgradeQueue?.length ? getQueueIds(userUpgradeQueue[0]) : [];
      // console.log('queueIds', queueIds);
      const installationIds = await getInstallationIdsbyGrid(scene.activeParcel.id, grid, 0, queueIds);
      // console.log('installationIds', installationIds);
      scene.activeParcel.installations = installationIds;
    } else return false;

    const tileGrid = await fetchContractGrid(
      realmDiamond,
      {
        type: scene.activeParcel.type,
        tokenId: scene.activeParcel.tokenId,
      },
      1,
    );

    // const tileGrid = await fetchContractGrid(realmDiamond, _.pick(scene.activeParcel, ['type', 'tokenId']), 1);
    if (tileGrid && scene.activeParcel) {
      _.assign(scene.activeParcel, { tileGrid });
      // console.log('tileGrid scene.activeParcel', scene.activeParcel);
      const tileIds = await getInstallationIdsbyGrid(scene.activeParcel.id, tileGrid, 1);
      // console.log('tileIds', tileIds);
      scene.activeParcel.installations = _.concat(scene.activeParcel.installations, tileIds);
    } else return false;

    return true;
  } else return true;
};

const checkParcelAccessRights = async (id: string): Promise<GotchiverseParcel> => {
  const installationData = getInstallationIdDataById(id);
  const accessRights = await getParcelAccessRights(
    [installationData.realmId],
    GlobalState.WEB3.state.currentNetwork,
    GlobalState.WEB3.state.globalProvider,
  );
  const accessRightsWhitelists = (await getParcelsAccessRightsWhitelistIds(
    [installationData.realmId],
    GlobalState.WEB3.state.currentNetwork,
    GlobalState.WEB3.state.globalProvider,
    true,
  )) as ParcelAccessRightsWhitelists[];

  const res = await fetchSubgraphParcelOwner(installationData.realmId);
  console.log('res', res);
  const owner = res?.parcels[0]?.owner?.toLowerCase();

  console.log('owner', owner);
  console.log('accessRights', accessRights);
  console.log('accessRightsWhitelists', accessRightsWhitelists);
  const parcelAccessData = { accessRights: accessRights[0], accessWhitelists: accessRightsWhitelists[0], owner };
  const canChannel = borrowerCanAccess(parcelAccessData, 'channel');
  console.log('canChannel', canChannel);
  const canEmptyReservoir = borrowerCanAccess(parcelAccessData, 'emptyReservoir');
  console.log('canEmptyReservoir', canEmptyReservoir);
  const canBuild = borrowerCanBuild(parcelAccessData);
  // console.log('canBuild', canBuild);
  if (canChannel || canEmptyReservoir || canBuild) {
    const parcelJsonData: GotchiverseParcel = PARCELS_BY_TOKEN_ID[installationData.realmId];
    if (!parcelJsonData) return;

    _.assign(parcelJsonData, parcelAccessData);
    const parcel: Parcel[] = transformParcelFormat([parcelJsonData]);

    GlobalState.REALM.state.ownedParcels = _.concat(GlobalState.REALM.state.ownedParcels, parcel);
    console.log('@checkParcelAccessRights: ownedParcels', GlobalState.REALM.state.ownedParcels);

    Parcels.destroy(parcel);
    Parcels.create(parcel);
    return parcelJsonData;
  }
};

const resetStates = (): void => {
  void setActiveInstallation();

  if (GlobalState?.UI?.state?.eventHologramState?.open) {
    toggleFollowGotchi(true);
    InputController.updateDisableKeyboard(false);
    GlobalState.UI.dispatch({
      type: 'UPDATE_EVENT_HOLOGRAM',
      eventHologramState: {
        open: false,
        installationId: undefined,
      },
    });
  }
};

// On installation click
const setActiveInstallation = async (id?: string): Promise<boolean> => {
  if (scene.buildInstallation) return;

  if (id) {
    let tokenId;
    const ownerdParcel = isOwnedById(id);
    console.log('@setActiveInstallation:ownerdParcel', ownerdParcel);

    // check parcel access rights
    if (!ownerdParcel && isAaltar(id)) {
      const parcelAccessRights = await checkParcelAccessRights(id);
      console.log('@setActiveInstallation:parcelAccessRights', parcelAccessRights);
      tokenId = parcelAccessRights ? parcelAccessRights.tokenId : false;
    } else tokenId = ownerdParcel ? ownerdParcel.tokenId : false;

    if (tokenId) {
      scene.activeInstallation = scene.installationGroup.get(id);
      if (!scene.activeInstallation) return;

      const installationData = getInstallationIdDataById(id);
      scene.activeInstallation.setDepth(installationData.type === 'INSTALLATION' ? 199 : 11);
      const installationImage = scene.activeInstallation.getByName('sprite');
      if (!scene.activeRealmId) scene.outLinePlugin?.add(installationImage, { thickness: 5, outlineColor: 0x009dff });
      scene.activeRealmId = Number(tokenId);
      SFXController.playFX('click');
      return true;
    }
  } else {
    // reset active installation
    scene.activeRealmId = false;
    if (scene.outLinePlugin && scene.activeInstallation?.data) {
      const installationImage = scene.activeInstallation.getByName('sprite');
      const activeId = scene.activeInstallation.data.get('id');
      const installationData = getInstallationIdDataById(activeId);
      scene.activeInstallation.setDepth(installationData.type === 'INSTALLATION' ? 100 + installationData.position.y : 10);
      scene.outLinePlugin?.remove(installationImage);
      if (installationImage) {
        scene.outLinePlugin?.remove(installationImage);
      }
      uiContainers[activeId]?.setVisible(false);
      scene.activeInstallation = undefined;
    }
  }
};

const setChannelContainerState = (id: string, state: boolean) => {
  if (!isAaltar(id)) return;
  if (!scene.buildModeInstallations) scene.buildModeInstallations = [];
  if (!state) {
    if (!scene.buildModeInstallations.includes(id)) scene.buildModeInstallations.push(id);
  } else {
    scene.buildModeInstallations = scene.buildModeInstallations.filter((item) => item !== id);
  }
  const installationContainer = scene.installationGroup.get(id);

  const channelingContainer = installationContainer?.getByName ? installationContainer.getByName('channelingContainer') : undefined;
  if (channelingContainer) channelingContainer.setVisible(state);
};

const calculateChannelState = (id, installationContainer, lastChanneledAlchemica) => {
  if (!id || !installationContainer || lastChanneledAlchemica == null || lastChanneledAlchemica === '') return;
  const channelingContainer = installationContainer.getByName('channelingContainer');
  const channelState = installationContainer.getByName('channelState');
  if (!channelingContainer || !channelState) return;
  const channelIcon = channelingContainer.getByName('channelIcon');
  const channelIconMain = channelingContainer.getByName('channelIconMain');
  const countDownText = channelingContainer.getByName('countdown');
  if (!channelIcon || !channelIconMain || !countDownText) return;

  const channelSeconds = secondsUntilParcelCanChannel(String(lastChanneledAlchemica), id.split('_')[1]);
  // console.log('@calculateChannelState:channelSeconds', id, channelSeconds);

  if (channelSeconds > 0) {
    // channelIcon.clearTint();
    channelIcon.setVisible(false);
    channelIconMain.setVisible(true);
    countDownText.setText(formatTimeLeft(channelSeconds));
    // Phaser.Display.Align.In.TopLeft(channelIcon, channelingContainer, 0, 0);
    Phaser.Display.Align.In.TopLeft(channelIconMain, channelingContainer, 0, 0);
    Phaser.Display.Align.In.TopRight(countDownText, channelingContainer, 0, 0);
    channelState.setVisible(false);
  } else {
    channelIcon.setVisible(true);
    channelIconMain.setVisible(false);
    channelIcon.setTint(...scene.tints.active);
    Phaser.Display.Align.In.Center(channelIcon, channelingContainer, 0, 0);
    countDownText.setText('');
    channelState.setVisible(true);
  }

  return channelSeconds;
};

const updateParcelLastChannel = async (id: string, parcelLastChanneled: string) => {
  const installationContainer = scene.installationGroup.get(id);
  if (!installationContainer) return;
  const parcel = getActiveParcelByTokenId(scene.activeRealmId);

  if (parcel) {
    parcel.lastChanneledAlchemica = parcelLastChanneled;
  }

  createAaltarChannelContainer(id, installationContainer, Number(parcelLastChanneled));
};

// WEB3
const handleEquipUnequipMove = async (selectedInstallation: EquipUnequipMoveData, callMethod: 'equip' | 'unequip' | 'move') => {
  const { itemId, relativePosition, type, realmId, isMoving } = selectedInstallation;
  console.log('selectedInstallation', selectedInstallation);

  if (scene.activeParcel) {
    const method: 'equipInstallation' | 'equipTile' | 'unequipInstallation' | 'unequipTile' | 'moveInstallation' | 'moveTile' =
      type === 'INSTALLATION' ? `${callMethod}Installation` : `${callMethod}Tile`;

    const equipUnequipContractData: EquipUnequipContract = {
      method,
      itemId,
      gotchiId: getSelectedGotchiId(),
      position: relativePosition,
      realmId: realmId || Number(scene.activeParcel.tokenId),
    };

    const moveData = isMoving ? getInstallationIdDataById(isMoving) : undefined;
    const moveContractData: MoveContract = { method, realmId, itemId, position: moveData?.position, positionNew: relativePosition };
    const installationId = createInstallationIdByData({
      parcelId: scene.activeParcel.id,
      itemId,
      x: relativePosition.x,
      y: relativePosition.y,
      type: type === 'INSTALLATION' ? '0' : '1',
      state: 0,
    });

    removeInstallationBuildModeUI(scene.activeInstallation);
    if (isMoving) {
      destroyMarker();
      destroyByIds([{ id: scene.buildInstallation.isMoving }], true);
      createByIds([{ id: installationId }], { isWaiting: true });
    }

    let notificationId, tx;
    try {
      notificationId = showTransactionNotification(GlobalState.NOTIFICATION.dispatch, {
        message: `${capitalizeFirstLetter(callMethod)} ${type}`,
        options: {
          sound: true,
        },
      });

      if (isMoving) {
        console.log('moveContractData', moveContractData);
        tx = await moveOnParcel(GlobalState.WEB3.state.ethersSigner, GlobalState.WEB3.state.currentNetwork, moveContractData);
      } else {
        console.log('equipUnequipContractData', equipUnequipContractData);
        tx = await equipUnequipOnParcel(GlobalState.WEB3.state.ethersSigner, GlobalState.WEB3.state.currentNetwork, equipUnequipContractData);
      }

      if (tx?.wait) {
        if (callMethod === 'equip') {
          createByIds([{ id: installationId }], { isWaiting: true });
        }
        SFXController.playFX('send');
        const res = await tx.wait();
        console.log('@equipUnequipOnParcel', res);

        if (res?.status) {
          if (callMethod === 'unequip') {
            unequipAnimationById(installationId);
          }
          if (notificationId) updateTransactionNotificationStatus(GlobalState.NOTIFICATION.dispatch, notificationId, 'success');
        }
      } else {
        if (notificationId) updateTransactionNotificationStatus(GlobalState.NOTIFICATION.dispatch, notificationId, 'error', getErrMessage(tx));
        if (isMoving) {
          createByIds([{ id: scene.buildInstallation.isMoving }], { isMove: true });
          destroyByIds([{ id: installationId }], true);
        }
      }
      scene.buildInstallation = undefined;
    } catch (error) {
      if (notificationId) updateTransactionNotificationStatus(GlobalState.NOTIFICATION.dispatch, notificationId, 'error', getErrMessage(tx));
      setTimeout(() => {
        destroyByIds([{ id: installationId }], true);
      }, 1);
      if (isMoving) {
        createByIds([{ id: scene.buildInstallation.isMoving }], { isMove: true });
        destroyByIds([{ id: installationId }], true);
      }
    }
    // use consumers to listen for EquipInstallation events to equip it on server.
  } else SFXController.fadeIn('collisionSound');
  destroyMarker(true);
};

const handleBatchEquip = async () => {
  // const { send } = useAavegotchiSound();
  if (scene.activeParcel) {
    let notificationId;
    if (GlobalState.NOTIFICATION.dispatch) {
      notificationId = showTransactionNotification(GlobalState.NOTIFICATION.dispatch, {
        message: 'Batch Equip',
        options: {
          sound: true,
        },
      });
    }

    const batchEquipContract: BatchEquipContract = {
      gotchiId: getSelectedGotchiId(),
      realmId: Number(scene.activeParcel.tokenId),
    };

    try {
      if (!GlobalState.WEB3.state.ethersSigner || !GlobalState.WEB3.state.currentNetwork) {
        throw new Error('Wallet not connected. Connect on Base and try Confirm again.');
      }
      if (!batchEquipContract.gotchiId && batchEquipContract.gotchiId !== 0) {
        throw new Error('Missing gotchi id for batch equip.');
      }
      if (!batchEquipContract.realmId && batchEquipContract.realmId !== 0) {
        throw new Error('Missing parcel token id for batch equip.');
      }

      const tx = await batchEquipOnParcel(GlobalState.WEB3.state.ethersSigner, GlobalState.WEB3.state.currentNetwork, batchEquipContract);
      if (tx?.wait) {
        if (scene.batchQueue.length) {
          // remove x button
          _.each(scene.batchQueue, ({ id }) => {
            uiContainers[`${id}-cancel`]?.destroy();
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete uiContainers[`${id}-cancel`];
          });
        }
        SFXController.playFX('send');
        const res = await tx.wait();
        // console.log('@batchEquip', res);
        if (scene.batchQueue.length) {
          _.each(scene.batchQueue, ({ id, action }) => {
            if (action === 'UNEQUIP') unequipAnimationById(id, true);
          });
        }
        scene.batchQueue = [];
        if (res?.status && notificationId) {
          updateTransactionNotificationStatus(GlobalState.NOTIFICATION.dispatch, notificationId, 'success');
        }
      } else {
        SFXController.playFX('oops');
        if (notificationId) updateTransactionNotificationStatus(GlobalState.NOTIFICATION.dispatch, notificationId, 'error', getErrMessage(tx));
        // Keep build mode open so the player can adjust the queue and retry.
      }
    } catch (error) {
      SFXController.playFX('oops');
      if (notificationId) updateTransactionNotificationStatus(GlobalState.NOTIFICATION.dispatch, notificationId, 'error', getErrMessage(error));
      // Keep queue + build mode so a signature/wallet failure is not destructive.
    }
    // use consumers to listen for EquipInstallation events to equip it on server.
  } else SFXController.fadeIn('collisionSound');
  destroyMarker(true);
};

// INSTALLATION ANIMATIONS needs to be moved in AnimationController
const handleEquipFX = (installationData) => {
  console.log('equip-installation', installationData);
  SFXController.playFX('equip_sound');
  if (!GlobalState.SETTINGS.state.allowInstallationAnimations) return;

  for (let i = 0; i < installationData.width; i++) {
    for (let j = 0; j < installationData.height; j++) {
      // equip animation
      const equipImage = scene.add
        .sprite(installationData.x + i * GOTCHI_SIZE.UNIT, installationData.y + j * GOTCHI_SIZE.UNIT, 'equip', 0)
        .setOrigin(0);
      equipImage.setDepth(203);
      AnimationsController.play(equipImage, 'equip_start', () => {
        AnimationsController.play(equipImage, 'equip_end');
      });
      // equipImage.on(
      //   'animationcomplete-equip_start',
      //   () => {
      //     AnimationsController.play(equipImage, 'equip_end');
      //   },
      //   this,
      // );
      // equipImage.on('animationcomplete-equip_end', () => equipImage.destroy(), this);
    }
  }
};
const unequipAnimationById = (id, isWaiting?: boolean) => {
  // handle unquip animation
  // console.log('unequipAnimationById', id, isWaiting);
  SFXController.playFX('unequip_sound');
  SFXController.playFX('destroy_installation_sound');
  const group = isWaiting ? scene.installationsWaiting : scene.installationGroup;
  if (!GlobalState.SETTINGS.state.allowInstallationAnimations) {
    group.get(id)?.destroy();
    group.delete(id);
    return;
  }

  const installationData = getTypeById(id);
  const { position, parcelId } = getInstallationIdDataById(id);
  const parcelPosition = getParcelPositionById(parcelId);
  const x = (parcelPosition.x + position.x) * GOTCHI_SIZE.UNIT;
  const y = (parcelPosition.y + position.y) * GOTCHI_SIZE.UNIT;

  // console.log('installation unequip data >> ', installationData);

  for (let i = 0; i < installationData.width; i++) {
    for (let j = 0; j < installationData.height; j++) {
      const unequipImage = scene.add
        .sprite(x + i * GOTCHI_SIZE.UNIT, y + j * GOTCHI_SIZE.UNIT, 'unequip', 0)
        .setDepth(203)
        .setOrigin(0);
      AnimationsController.play(unequipImage, 'unequip');
      unequipImage.on('animationupdate', (anim, frame, obj, key) => {
        if (frame.index === 11) {
          group.get(id)?.destroy();
          group.delete(id);
        }
      });
    }
  }
};

const handleSpillOverAnim = async (id: string, type?: Tokens) => {
  console.log('@handleSpillOverAnim', id, type);
  const data = await getAllDataById(id);
  const container = scene.installationGroup.get(id);
  if (data) {
    const spillover = scene.add.sprite(data.globalPosition.x, data.globalPosition.y, 'spillover', 0).setOrigin(0.5).setDepth(500);
    if (type) spillover.setTint(...scene.tints[type]);

    Phaser.Display.Align.In.BottomCenter(spillover, container);
    SFXController.playFX('spillover_start');
    AnimationsController.play(spillover, 'spillover');
    // spillover.on('animationcomplete', () => spillover.destroy());
  }
};

// Channeling Animation
const addFlamesToAaltar = async (id, state) => {
  const data = await getAllDataById(id);
  const container = scene.installationGroup.get(id);
  const flamesData = data.spriteMetadata.offsets[data.typeData.level - 1];

  if (data && flamesData && container) {
    if (state) {
      // add flames animation
      flamesData.forEach((offset) => {
        const flame = scene.add.sprite(offset.x, offset.y, 'flame', offset.frame).setDepth(301).setName(offset.key);
        flame.setOrigin(0.5, 1);
        container.add(flame);
        // console.log('playing flame animation>>', `${offset.key}_flame`);
        AnimationsController.play(flame, `${offset.key}_flame`);
      });
    } else {
      flamesData.forEach(({ key }) => {
        const flame = container.getByName(key);
        if (flame) {
          flame.destroy();
        }
      });
    }
  }
};

// Maaker
const handleMaakerAnim = (id: string, installationId?: string) => {
  if (!scene) return;
  // we can get all data from that Id, we don't need to send any other information
  const container = scene.installationGroup.get(id);
  if (!container) return;

  container.setName(id);
  const baseImage = container.getByName('sprite');
  const installationData = getInstallationIdDataById(id);
  const upgrades = _.filter(getLocalInstallationsByParcelId(installationData.parcelId), (id) => id.split('_')[5] === '1');

  // set bot ids data
  if (upgrades?.length && !container.getData('bots')) container.setDataEnabled().data.set('bots', []);

  const parcelId = getInstallationIdDataById(id)?.parcelId;

  const rollAnimation = (upgradeId: string, index?: number) => {
    if (!scene?.sys?.scene) return;
    const maakerDoor = scene.add.sprite(baseImage.x / 2, baseImage.y / 2, 'maaker_door', 0).setOrigin(0);
    maakerDoor.setName('maaker_door');
    container.add(maakerDoor);
    Phaser.Display.Align.In.Center(maakerDoor, baseImage, 1.5, 19);

    AnimationsController.play(maakerDoor, 'maaker_door_open');
    // if (parcelId) SFXController.updateParcelSound(parcelId, 'maaker_bot_send', true);

    const maakerBot = scene.add
      .sprite(baseImage.x / 2, baseImage.y / 2, 'maaker_bot', 11)
      .setOrigin(0.5)
      .setName(upgradeId)
      .setVisible(false)
      .setDataEnabled()
      .setDepth(1000);

    // set data for receive animation
    maakerBot.data.set('parentId', id);
    maakerBot.data.set('parcelId', parcelId);

    let bots = container.getData('bots');
    if (!bots) bots = [];
    bots.push(upgradeId);
    container.data.set('bots', bots);

    scene.maakerBotsGroup.set(upgradeId, maakerBot);

    Phaser.Display.Align.In.Center(maakerBot, container, 0, -20);

    maakerDoor.on('animationupdate', (anim, frame, obj, key) => {
      // spawn maaker bot and bot shadow
      // console.log('anim', anim);
      if (frame.index === 17 && anim.key === 'maaker_door_open') {
        // console.log('spawn maaker_bot ');
        maakerBot.setVisible(true);
        // send to destination
        createBotTrajectory(maakerBot, upgradeId, 'send');
        // we can't create trajectories in the same time becuase it calculates duration based on current location.
        if (maakerBot) AnimationsController.play(maakerBot, 'maaker_bot_fly');
        maakerBotUpTween(maakerBot);
      }
    });
    // dont destroy door we need this animations for send and receive bot
    // maakerDoor.on('animationComplete', () => maakerDoor.destroy());
    maakerDoor.on('animationComplete', () => {
      if (index && index === upgrades.length - 1) {
        container.data.set('init', false);
      }
    });
  };
  if (installationId) {
    if (!container.data.get('init')) {
      // console.log('init Spearate', installationId);
      rollAnimation(installationId);
    }
    return;
  }

  container.data.set('init', true);
  upgrades.forEach((upgrade, index) => {
    setTimeout(() => {
      // console.log('upgrades', upgrades);
      rollAnimation(upgrade, index);
    }, index * 7000);
  });
};

const maakerBotUpTween = (maakerBot) => {
  const parcelId = maakerBot.getData('parcelId');
  scene.add.tween({
    targets: [maakerBot],
    y: { value: '-=120', duration: 1000, ease: 'Linear' },
    delay: 0,
    onStart: () => {
      if (parcelId) {
        // SFXController.updateParcelSound(parcelId, 'maaker_bot_send', false);
        // SFXController.updateParcelSound(parcelId, 'maaker_bot', true);
      }
      if (maakerBot) AnimationsController.play(maakerBot, 'maaker_bot_forward');
    },
    onComplete: () => {
      AnimationsController.play(maakerBot, 'maaker_bot_idle');
      if (maakerBot?.send) maakerBot.send.play();
    },
  });
};

const maakerBotDownTween = (maakerBot) => {
  const parentId = maakerBot.getData('parentId');
  // const parcelId = maakerBot.getData('parcelId');
  const maakerDoor = scene.installationGroup?.get(parentId)?.getByName('maaker_door');
  if (!maakerDoor) return;
  AnimationsController.play(maakerDoor, 'maaker_door_close');
  // SFXController.updateParcelSound(parcelId, 'maaker_bot_receive', true);

  scene.add.tween({
    targets: [maakerBot],
    y: { value: '+=101', duration: 1500, ease: 'Linear' },
    delay: 1500,
    onComplete: () => {
      scene.maakerBotsGroup.delete(maakerBot.name);
      // SFXController.updateParcelSound(parcelId, 'maaker_bot', false);
      maakerBot?.destroy();
      // maakerDoor.on('animationcomplete-maaker_door_close', () => {
      //   // SFXController.updateParcelSound(parcelId, 'maaker_bot_send', true);
      //   // SFXController.updateParcelSound(parcelId, 'maaker_bot_send', false);
      //   maakerDoor?.destroy();
      //   console.log('maaker receive done');
      // });
      AnimationsController.play(maakerDoor, 'maaker_door_close', () => maakerDoor?.destroy());
    },
  });
};

const createBotTrajectory = (maakerBot, destinationId: string, type: 'send' | 'receive') => {
  const destinationContainer = scene.installationGroup.get(destinationId);
  if (!destinationContainer) return;

  const currentPos: Vector2 = new Phaser.Math.Vector2(maakerBot.x, maakerBot.y);
  // console.log('currentPos', currentPos);

  const destination: Vector2 = new Phaser.Math.Vector2(destinationContainer.x, destinationContainer.y - 120);
  // console.log('destination', destination);

  const distance = Phaser.Math.Distance.BetweenPoints(currentPos, destination);
  // console.log('distance', distance);

  const duration = (distance / 200) * 1000;
  // console.log('duration', duration);
  if (type === 'send') {
    handleBotSend(maakerBot, destination, duration);
  } else {
    handleBotReceive(maakerBot, destination, duration);
  }
  return { destination, duration };
};

const handleBotSend = (maakerBot, destination, duration) => {
  maakerBot.send = scene.add.tween({
    targets: [maakerBot],
    props: {
      x: { value: destination.x, duration, ease: 'Linear' },
      y: { value: destination.y, duration, ease: 'Linear' },
    },
    paused: true,
    onStart: () => {
      maakerBot.setVisible(true);
    },
    onComplete: () => {
      if (maakerBot) AnimationsController.play(maakerBot, 'maaker_bot_fix');
      // console.log('complete destination');
    },
  });
};

const handleBotReceive = (maakerBot, destination, duration) => {
  // maakerBot.on('animationcomplete-maaker_bot_backward', () => {
  //   if (maakerBot) AnimationsController.play(maakerBot, 'maaker_bot_fly');
  //   // console.log('receive 1');
  // });
  AnimationsController.play(maakerBot, 'maaker_bot_backward', () => {
    if (maakerBot) AnimationsController.play(maakerBot, 'maaker_bot_fly');
  });

  // reverse animation > fly > move to base > go down > door_close > done
  maakerBot.receive = scene.add.tween({
    targets: [maakerBot],
    props: {
      x: { value: destination.x, duration, ease: 'Linear' }, // update the duration based on the distance between target and destination.
      y: { value: destination.y, duration, ease: 'Linear' },
    },
    paused: true,
    delay: 100,
    onStart: () => {
      if (maakerBot) AnimationsController.play(maakerBot, 'maaker_bot_backward');
      // console.log('started destination ');
    },
    onComplete: () => {
      maakerBotDownTween(maakerBot);
      // console.log('receive 0');
    },
  });
  if (maakerBot.send) maakerBot.send.stop();
  maakerBot.receive.play();
};

const destroyMaakerBots = (id) => {
  const maakerContainer = scene.installationGroup.get(id);
  if (!maakerContainer) return;
  // console.log('maakerContainer', maakerContainer);
  const bots = maakerContainer.getData('bots');
  // console.log('bots', bots);
  if (bots?.length) {
    _.each(bots, (botId) => {
      const maakerBot = scene.maakerBotsGroup.get(botId);
      // console.log('maakerBot', maakerBot);
      if (!maakerBot) return;
      maakerBot.send?.stop();
      scene.maakerBotsGroup.delete(botId);
      maakerBot?.destroy();
    });
  }
};

const Installations: InstallationInterface = {
  isActive: false,
  buildModeState: false,
  createByIds,
  toggleBrush,
  updateBuildMarkerPosition,
  destroyByIds,
  destroyAll,
  toggleBuildMode,
  setActiveInstallation,
  placeInstallation,
  updateParcelLastChannel,
  addFlamesToAaltar,
  handleSpillOverAnim,
  handleEquipUnequipMove,
  handleBatchEquip,
  updatePlaceQueue,
  resetStates,
};

export default Installations;
