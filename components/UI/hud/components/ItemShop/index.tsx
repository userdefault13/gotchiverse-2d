/* eslint-disable multiline-ternary */
import { CartItem, IndentedPanel, ShopItemElement } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { useEffect, useState } from 'react';
import { ShopItem, ShopPurchase, Status, StatusNotification, TokenCounters } from 'types';
import styles from './styles';
import _ from 'lodash';
import { shopItemsById, AVAILABLE_SHOP_ITEMS, AllowedItemTypeId, isFoundryShopItem, getFoundryKitId } from 'helpers/items.helpers';
import { getZeroTokens } from 'helpers/realm.helper';
import { getOnChainAlchemicaIcon } from 'helpers/functions';
import Image from 'next/image';
import GameController from 'components/controllers/GameController';
import { useUI } from 'contexts/UIContexts';
import { handleStatusNotification } from 'contexts/NotificationContext/actions';
import { fetchItemStoreAvilable } from 'helpers/api.helpers';
import { isColyseusNetcode } from 'helpers/colyseus.client';
import { FoundryNet } from 'helpers/foundry';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ItemShop = ({ open, onClose }: Props): JSX.Element => {
  const [cartItems, setCartItems] = useState({});
  const [purchaseState, setPurchaseState] = useState<Status>('init');
  const [totalCost, setTotalCost] = useState<TokenCounters>();
  const [supply, setSupply] = useState<ShopQuantities>();
  const [{ itemShopState }] = useUI();

  interface ShopQuantities {
    [id: AllowedItemTypeId]: number;
  }

  // Listen for order state updates
  useEffect(() => {
    if (!itemShopState?.purchaseStatus?.status) return;

    // Update supply
    void fetchAndSetCurrentSupply();

    // Trigger notification based on received status update
    const notification: StatusNotification = { type: 'purchase', data: _.pick(itemShopState.purchaseStatus, ['status', 'error']) };
    void handleStatusNotification(notification);

    // Set local status for component handling
    setPurchaseState(itemShopState.purchaseStatus.status);
    if (itemShopState.purchaseStatus.status === 'success') setCartItems({});
  }, [itemShopState]);

  // Fech initial supply
  useEffect(() => {
    if (!open) return;
    // Fetch API current supply on mount.
    void fetchAndSetCurrentSupply();
    setPurchaseState('init');
  }, [open]);

  // update total cost on cartItems update to get all token cost sum
  useEffect(() => {
    const totalCost = getZeroTokens();
    _.each(cartItems, (count, id) => {
      _.each(shopItemsById[id].cost, (cost, token) => (totalCost[token] += cost * count));
    });
    setTotalCost(totalCost);
  }, [cartItems]);

  const fetchAndSetCurrentSupply = async () => {
    const supply = await fetchItemStoreAvilable();
    // console.log('@fetchAndSetCurrentSupply: supply', supply);
    if (supply) setSupply(supply);
  };

  const updateCartItems = (id: AllowedItemTypeId, count: number) => {
    if (purchaseState !== 'init') setPurchaseState('init');
    const newCart = { ...cartItems, [id]: count };
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    if (!count && _.has(newCart, id)) delete newCart[id];
    setCartItems(newCart);
  };

  // Handle Shop Actions
  const handlePurchase = async () => {
    const cartLines = _.map(cartItems, (quantity, id) => ({ id: Number(id), quantity }));
    const foundryLines = cartLines.filter((line) => isFoundryShopItem(shopItemsById[line.id]));
    const legacyLines = cartLines.filter((line) => !isFoundryShopItem(shopItemsById[line.id]));

    if (isColyseusNetcode() && foundryLines.length) {
      const info = getOrderDescription({ items: foundryLines });
      const notification: StatusNotification = { type: 'purchase', data: { status: 'init', info } };
      await handleStatusNotification(notification, { signature: false, sound: true });

      let ok = true;
      for (const line of foundryLines) {
        const item = shopItemsById[line.id];
        for (let i = 0; i < line.quantity; i += 1) {
          const r = FoundryNet.purchaseSalvage(getFoundryKitId(item));
          if (!r.ok) ok = false;
        }
      }

      if (legacyLines.length) {
        ok = false;
      }

      setPurchaseState(ok ? 'success' : 'failed');
      if (ok) setCartItems({});
      const doneNotification: StatusNotification = {
        type: 'purchase',
        data: { status: ok ? 'success' : 'failed', error: legacyLines.length ? 'Foundry kits require separate checkout' : '' },
      };
      void handleStatusNotification(doneNotification);
      return;
    }

    const purchaseData: ShopPurchase = {};
    // Transform purchaseData in BE readable purchaseData.
    purchaseData.items = cartLines;
    const info = getOrderDescription(purchaseData);
    // Init Notification, notification message/title will be predefined.
    const notification: StatusNotification = { type: 'purchase', data: { status: 'init', info } };
    await handleStatusNotification(notification, { signature: false, sound: true });

    // console.log('@handlePurchase - Init store-purchase with cart:', purchaseData);
    GameController.sendData('game-actions', 'store-purchase', purchaseData);
  };

  const getOrderDescription = (purchaseData: ShopPurchase) => {
    let info = '';
    _.each(purchaseData.items, (cartItem) => {
      const item: ShopItem = shopItemsById[cartItem.id];
      info += ` ${cartItem.quantity}x${item.label},`;
    });
    info += ' for';
    _.each(totalCost, (val, token) => (info += val ? ` ${val}${token} ` : ''));
    return info;
  };

  const handleOnClose = (): void => {
    // reset cart & update prev purchase purchase state
    setCartItems({});
    setPurchaseState('init');
    onClose();
  };

  return (
    <>
      <IndentedPanel
        hideSides={{ right: true, bottom: true }}
        borrowedColor
        isSidePanelFrame={true}
        inheritHeight
        isItemShop
        padding={1}
        title={{ value: 'ITEM SHOP', fontSize: '3.2rem' }}
      >
        <div className="item-shop-container">
          <div className="items-container scrollable info">
            {/* Map filtered item-shop.json file from shared! */}
            {AVAILABLE_SHOP_ITEMS.map((item: ShopItem) => (
              <ShopItemElement
                item={item}
                quantity={supply?.[item.itemTypeId]}
                count={cartItems[item.itemTypeId]}
                key={item.itemTypeId}
                onChange={(count: number) => updateCartItems(item.itemTypeId, count)}
              />
            ))}
            <ShopItemElement item="coming" />
          </div>
          <div className="spacer" />
          <div className="cart-container">
            {AVAILABLE_SHOP_ITEMS.map(
              (item: ShopItem, index) =>
                cartItems[item.itemTypeId] > 0 && (
                  <CartItem
                    item={item}
                    count={cartItems[item.itemTypeId]}
                    key={index}
                    editable={purchaseState !== 'success'}
                    onClose={() => updateCartItems(item.itemTypeId, 0)}
                  />
                ),
            )}
          </div>
          <div className="status-container">
            {purchaseState === 'success' || purchaseState === 'failed' ? (
              <div className={`purchase-state ${purchaseState === 'failed' ? 'error' : 'success'}`}>
                {purchaseState === 'success' ? 'purchase sucessful!' : 'please try again'}
              </div>
            ) : (
              <div className="cost-container">
                TOTAL:
                {_.map(
                  totalCost,
                  (cost, token) =>
                    !!cost && (
                      <div className={`cost-item ${token.toLowerCase()} flex-c-c gap-1 ml-5`} key={token}>
                        <div className="cost-icon">
                          <Image alt="" src={getOnChainAlchemicaIcon(token, true)} layout="fill" />
                        </div>
                        <span className="cost">{cost}</span>
                      </div>
                    ),
                )}
              </div>
            )}
          </div>
          <div className="cta-container">
            <Button fullWidth size={2.8} disabled={purchaseState === 'success' || _.isEmpty(cartItems)} onClick={handlePurchase}>
              BUY NOW
            </Button>
            <button className="btn-close" onClick={handleOnClose}>
              Close
            </button>
          </div>
        </div>
      </IndentedPanel>
      <style jsx>{styles}</style>
    </>
  );
};
