import _ from 'lodash';
import { Gmls, HeartIcon, LightningIcon, PLM2, PotionQuickslotAP, PotionQuickslotHP } from 'assets';
import itemsJSON from 'shared_code/data/item-shop.json';
import { QuickslotsType, ShopItem, QuickslotsAllowedIndexes, ShopItemFE, QuickSlotItem, QuickslotIndex, ItemsIcon, AllowedTokenTypes } from 'types';
import GameController from 'components/controllers/GameController';
import GlobalState from 'contexts/GlobalState';
import { ElementBgAp, ElementBgEnemy, ElementBgHp, ElementBgPLM2, ElementIconAttack, ElementIconLifespan } from 'assets/icons/itemshop';
import SFXController from 'components/controllers/SFXController';
import { scene } from 'components/controllers/SceneController';
import { getColyseusMap } from 'helpers/colyseus.map';
import { isColyseusNetcode } from 'helpers/colyseus.client';

export const SHOP_ITEMS: ShopItem[] = _.values(itemsJSON) as unknown as ShopItem[];
export const AVAILABLE_SHOP_ITEMS: ShopItem[] = _.filter(SHOP_ITEMS, 'purchasable');
const SHOP_ITEM_IDS = _.keys(itemsJSON);

export type AllowedItemTypeId = typeof SHOP_ITEM_IDS[number];

// reconstruct shopItemsById
export const shopItemsById = _.keyBy(SHOP_ITEMS, 'itemTypeId');

export function isFoundryShopItem(item: ShopItem | undefined): boolean {
  return Boolean(item && (item.type === 'foundry' || item.category === 'foundry'));
}

export function getFoundryKitId(item: ShopItem): string {
  return item.foundryKitId || 'antenna-kit';
}

export const ITEM_ICONS: { [id in ItemsIcon]: string } = {
  ap: LightningIcon,
  hp: HeartIcon,
  lifespan: ElementIconLifespan,
  attack: ElementIconAttack,
};

// Used to drop alchemica breadcrumbs on token click.
// On aarena-rh (Colyseus), hotkeys credit SIM NVDA pocket when RH_TEST_DROP_ENABLED (no wallet gate).
export const handleDrop = (token: AllowedTokenTypes): void => {
  if (scene.disableKeyboard) return;

  // RH Colyseus test path — skip inventory/wallet gates; server gates via RH_TEST_DROP_ENABLED.
  if (isColyseusNetcode() && getColyseusMap() === 'aarena-rh') {
    SFXController.playFX('click');
    GameController.sendData('game-actions', 'token-drop', { token });
    return;
  }

  if (!GlobalState.GAME.state.gameConfig.enableGotchiInventory) return;
  if (!Number(GlobalState.REALM.state.playerWallet[token.toLocaleLowerCase()])) {
    // Balance is 0;
    SFXController.playFX('oops');
    return;
  }
  SFXController.playFX('click');
  // console.log('@handleDrop: sent action "token-drop" on  "game-actions" channel for token:', token);
  GameController.sendData('game-actions', 'token-drop', { token });
};

export const initItemsHelper = (): void => {
  // Assign default cooldown periods.

  const SHOP_ITEM_EXTRAS: { [id in AllowedItemTypeId]: ShopItemFE } = {
    1: {
      image: ElementBgHp,
      quickslotImage: PotionQuickslotHP,
      icon: HeartIcon,
      cooldown: GlobalState.GAME.state.gameConfig.cooldownsByItemType.hp,
      alchemicaType: 'KEK',
    },
    2: {
      image: ElementBgAp,
      quickslotImage: PotionQuickslotAP,
      icon: LightningIcon,
      cooldown: GlobalState.GAME.state.gameConfig.cooldownsByItemType.ap, // TODO We need to dynamically update this from redis.
      alchemicaType: 'ALPHA',
    },
    3: {
      image: ElementBgEnemy,
      quickslotImage: Gmls,
      icon: Gmls,
      cooldown: GlobalState.GAME.state.gameConfig.cooldownsByItemType.enemy,
      alchemicaType: 'FUD',
    },
    4: {
      image: ElementBgPLM2,
      quickslotImage: PLM2,
      icon: PLM2,
      cooldown: GlobalState.GAME.state.gameConfig.cooldownsByItemType.enemy,
    },
    5: {
      image: ElementBgAp,
      icon: LightningIcon,
      cooldown: 0,
      alchemicaType: 'FUD',
    },
  };

  // assign FE params like images image and quickslotImg
  _.map(SHOP_ITEMS, (item: ShopItem) => _.assign(item, SHOP_ITEM_EXTRAS[item.itemTypeId]));
};

// QUICKSLOTS HELPER
export const getEmptyQuickslots = (): QuickslotsType => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const quickslots = {} as QuickslotsType;
  for (const index of QuickslotsAllowedIndexes) quickslots[index] = { index, hotkey: (index + 1).toString() };
  return quickslots;
};

export const handleQuickslotAction = (index: QuickslotIndex): void => {
  GameController.sendData('game-actions', 'quickslot-use', {
    index,
  });
};

export const getItemCooldownLeft = (item: QuickSlotItem): number => {
  if (!item?.id) return;
  const now = Date.now();
  const { cooldown } = shopItemsById[item.id];

  const timePassed = item?.lastUse ? item.lastUse + (cooldown || 0) * 1000 : now;
  return timePassed - now > 0 ? timePassed - now : 0;
};

export const emptyQuickslots: QuickslotsType = getEmptyQuickslots();
