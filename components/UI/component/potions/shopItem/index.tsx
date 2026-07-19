/* eslint-disable @typescript-eslint/indent */
/* eslint-disable multiline-ternary */
import { formatTime, getIndentedProps, getOnChainAlchemicaIcon, nFormatter } from 'helpers/functions';
import _ from 'lodash';
import Image from 'next/image';
import { ItemsIcon, ShopItem } from 'types';
import styles from './styles';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealm } from 'contexts/RealmContext';
import { MinusIcon, PlusIcon } from 'components/UI/elements';
import { ITEM_ICONS } from 'helpers/items.helpers';
import { ENEMY_DEFAULTS } from 'shared_code/constants/const.game';
import Truncate from 'components/UI/widgets/Truncate';
import { Portal } from 'components/utility/Portal';

interface ShopItemInterface {
  item: ShopItem | 'coming';
  quantity?: number; // use this to hookup  the new design
  count?: number;
  onChange?: (count: number) => void;
}

export const ShopItemElement = ({ item, quantity, count, onChange }: ShopItemInterface): JSX.Element => {
  const [{ playerWallet }] = useRealm();
  const [purchasable, setPurchasable] = useState(false);

  const onInc = useCallback(() => {
    if (!purchasable) return;
    if (onChange) onChange((count ?? 0) + 1);
  }, [count, onChange]);

  const onDec = useCallback(() => {
    if (count > 0 && onChange) onChange(count - 1);
  }, [count, onChange]);

  const [isTooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const itemDivRef = useRef<HTMLDivElement>(null);

  const handleTooltipEnter = useCallback(
    (e) => {
      e.preventDefault();
      if (item === 'coming' || !itemDivRef.current) return;
      const rect = itemDivRef.current.getBoundingClientRect();
      setCoords({
        left: rect.x + rect.width / 4,
        top: rect.y - rect.height / 4,
      });
      setTooltipVisible(true);
    },
    [item, itemDivRef.current],
  );

  const handleTooltipLeave = useCallback(
    (e) => {
      e.preventDefault();
      if (item === 'coming' || !itemDivRef.current) return;
      setTooltipVisible(false);
    },
    [item, itemDivRef.current],
  );

  useEffect(() => {
    if (item === 'coming') return;
    const newCount = (count ?? 0) + 1;
    let _purchasable = true;

    Object.entries(item.cost).forEach(([_token, cost]) => {
      const token = _token.toLowerCase();
      if (!playerWallet[token] || playerWallet[token] < cost * newCount) _purchasable = false;
    });

    setPurchasable(_purchasable);
  }, [playerWallet, count]);

  const getProps = (category: string, typeKey: string, key: ItemsIcon): string => {
    if (typeKey === 'coming') return 'coming';
    return category === 'enemy' ? getIndentedProps(key, ENEMY_DEFAULTS[typeKey]) : key;
  };

  return (
    <>
      <div
        className={`shop-item-component ${item !== 'coming' ? item.category + '-type' : ''}`}
        ref={itemDivRef}
        onMouseOver={handleTooltipEnter}
        onMouseOut={handleTooltipLeave}
      >
        {item === 'coming' ? (
          <div className="msg-coming flex-c-c mx-auto">coming soon!</div>
        ) : (
          <div className="card">
            <div className="title-section flex items-center justify-between">
              <span>
                <Truncate chars={12}>{item.label}</Truncate>
              </span>
              <span className="quantity">x{quantity}</span>
            </div>
            <div className="item-info">
              <div className="item-image-container clickable" onClick={onInc}>
                <Image alt="" src={item.image} layout="fill" objectFit="contain" />
              </div>

              <div className="item-description-wrapper clickable" onClick={onInc}>
                {/* Temporary removing lifespan references as enemy lifespans are now unlimited for now */}
                {_.keys(item.propDescription).filter(key => key !== 'lifespan').map((key) => (
                  <div className="description-item" key={key}>
                    <span className="description-icon">
                      <Image alt="" src={ITEM_ICONS[key]} layout="fill" objectFit="contain" />
                    </span>
                    <span className="description-text">
                      {item.category !== 'enemy'
                        ? getProps(item.category, item.type, item.propDescription[key] as ItemsIcon)
                        : key === 'lifespan'
                        ? formatTime(getProps(item.category, item.type, item.propDescription[key] as ItemsIcon))
                        : key === 'hp'
                        ? nFormatter(Number(getProps(item.category, item.type, item.propDescription[key] as ItemsIcon)), 0)
                        : key === 'attack'
                        ? `${Number(getProps(item.category, item.type, item.propDescription[key] as ItemsIcon)) * 100}%`
                        : getProps(item.category, item.type, item.propDescription[key] as ItemsIcon)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tooltip only GMLS */}
              {item.category === 'enemy' && isTooltipVisible ? (
                <Portal target="#portal-tooltip">
                  <div
                    className="tooltip-container"
                    style={{
                      left: coords.left,
                      top: coords.top,
                    }}
                  >
                    <div className="trait-label">{item.labelTooltip}</div>
                    <div className="trait-description">{item.description}</div>
                    {/* Temporary removing lifespan references as enemy lifespans are now unlimited for now */}
                    {_.keys(item.propDescription).filter(key => key !== 'lifespan').map((key) => (
                      <div className="trait-details" key={key}>
                        <span className="trait-icon">
                          <Image alt="" src={ITEM_ICONS[key]} layout="fill" objectFit="contain" />
                        </span>
                        <span className="trait-value">
                          <span className="label">
                            {key === 'lifespan' ? 'Lifespan' : key === 'hp' ? 'HP' : key === 'attack' ? 'DMG per attack' : key}:{' '}
                          </span>
                          <span className="value">
                            {key === 'lifespan'
                              ? formatTime(getProps(item.category, item.type, item.propDescription[key] as ItemsIcon))
                              : key === 'hp'
                              ? nFormatter(Number(getProps(item.category, item.type, item.propDescription[key] as ItemsIcon)), 0)
                              : key === 'attack'
                              ? `${Number(getProps(item.category, item.type, item.propDescription[key] as ItemsIcon)) * 100}%`
                              : getProps(item.category, item.type, item.propDescription[key] as ItemsIcon)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </Portal>
              ) : null}

              <div className="cost-wrapper">
                {_.map(item.cost, (value, token) => (
                  <div className="item-price-container" key={token}>
                    <div className="item-price-alchemica">
                      <Image alt="" src={getOnChainAlchemicaIcon(token, true)} layout="fill" />
                    </div>
                    <div className={`item-price ${token.toLowerCase()}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="cta-container">
              {!count ? (
                <button className="cta" onClick={onInc} disabled={!purchasable}>
                  Add
                </button>
              ) : (
                <>
                  <button className="cta flex-c-c" disabled={!count} onClick={onDec}>
                    <MinusIcon fill={count > 0 ? 'var(--col-black)' : 'var(--col-btn-disabled)'} />
                  </button>
                  <div className="counter">{count}</div>
                  <button className="cta flex-c-c" onClick={onInc} disabled={!purchasable}>
                    <PlusIcon fill={purchasable ? 'var(--col-black)' : 'var(--col-btn-disabled)'} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
