import { Decimal } from 'decimal.js';
import { GotchiSVG } from 'components/UI/widgets';
import styles from './styles';
import {
  LightningIcon,
  HeartIcon,
  ArmorIcon,
  AttackSpeedIcon,
  EvasionIcon,
  RangeDamageIcon,
  MeleeDamageIcon,
  LootBagIcon,
  RegenIcon,
  InGameArmorPointIcon,
  InGameAttackRateIcon,
  InGameHPRegenIcon,
} from 'assets/icons';
import Image from 'next/image';
import { HealthBar, ToggleIcon } from 'components/UI/elements';
import { useRealm } from 'contexts/RealmContext';
import { getAlchemicaIcon } from 'helpers/functions';
import { useCallback, useEffect, useMemo, useState } from 'react';
import GameController from 'components/controllers/GameController';
import QuickslotsGrid from 'components/UI/component/quickslots/QuickslotsGrid';
import { isTrueSpectator } from 'helpers/gotchi.helper';
import _ from 'lodash';
import { useGame } from 'contexts/GameContext';
import { TraitDetails } from 'types';
import { InGameAPRegenIcon, InGameEvadeRateIcon, InGameMaxAPIcon, InGameMaxHPIcon, InGameMeleeDmgIcon, InGameRangedDmgIcon } from 'assets';

const initialTraitDetails: TraitDetails[] = [
  {
    icon: ArmorIcon,
    iconLarge: InGameArmorPointIcon,
    label: 'Armor',
    key: 'defense',
    description: 'Armor Power',
    gotchiTraitModifierLabel: 'AGG <50',
  },
  {
    icon: AttackSpeedIcon,
    iconLarge: InGameAttackRateIcon,
    label: 'Attack Speed',
    key: 'speed',
    description: 'Attack Rate',
    gotchiTraitModifierLabel: 'AGG >50',
  },
  {
    icon: EvasionIcon,
    iconLarge: InGameEvadeRateIcon,
    label: 'Evasion',
    key: 'evasion',
    description: 'Evade Rate',
    gotchiTraitModifierLabel: 'SPK >50',
  },
  {
    icon: MeleeDamageIcon,
    iconLarge: InGameMeleeDmgIcon,
    label: 'Melee Damage',
    key: 'melee',
    description: 'Melee Damage',
    gotchiTraitModifierLabel: 'BRN <50',
  },
  {
    icon: RangeDamageIcon,
    iconLarge: InGameRangedDmgIcon,
    label: 'Ranged Damage',
    key: 'range',
    description: 'Ranged Damage',
    gotchiTraitModifierLabel: 'BRN >50',
  },

  {
    icon: RegenIcon,
    iconLarge: InGameMaxHPIcon,
    label: 'Regen',
    key: 'maxHealth',
    description: 'Max HP',
    gotchiTraitModifierLabel: 'NRG <50',
    tooltip: true,
  },
  {
    icon: RegenIcon,
    iconLarge: InGameMaxAPIcon,
    label: 'Regen',
    key: 'maxAP',
    description: 'Max AP',
    gotchiTraitModifierLabel: 'NRG <50',
    tooltip: true,
  },
  {
    icon: RegenIcon,
    iconLarge: InGameHPRegenIcon,
    label: 'Regen',
    key: 'regen',
    description: 'Health Regen',
    gotchiTraitModifierLabel: 'SPK <50',
    tooltip: true,
  },
  {
    icon: RegenIcon,
    iconLarge: InGameAPRegenIcon,
    label: 'Regen',
    key: 'apRegenAmount',
    description: 'AP Regen',
    gotchiTraitModifierLabel: 'SPK <50',
    tooltip: true,
  },
  {
    icon: RegenIcon,
    iconLarge: InGameHPRegenIcon,
    label: 'Regen',
    key: 'alchemicaCarryingCapacity',
    description: 'Carry Capacity',
    gotchiTraitModifierLabel: 'BRS',
    tooltip: true,
  },
  {
    icon: RegenIcon,
    iconLarge: InGameHPRegenIcon,
    label: 'Regen',
    key: 'luck',
    description: 'Luck',
    gotchiTraitModifierLabel: 'SPK >50',
    tooltip: true,
  },
];

export const PlayerDashboard = (): JSX.Element => {
  const [{ selectedPlayer, alchemica, userTraits, userTraitsBases, userWearableTraitBonuses, health, gotchiUrl }] = useRealm();
  const [isExtended, setIsExtended] = useState<boolean>(true);
  const [isTooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const isArena = GameController.MAP === 'aarena';
  const [traitsData, setTraitsData] = useState<TraitDetails[]>([]);
  const [{ gameConfig }] = useGame();

  useEffect(() => {
    const updatedData = _.map(initialTraitDetails, (d) => {
      const updateObj = {
        ...d,
        value: userTraits ? userTraits[d.key] : 0,
        increase: userTraits && userTraitsBases ? Number(Decimal.sub(userTraits[d.key] || 0, userTraitsBases?.[d.key] || 0)) : 0,
      };
      if (!updateObj.increase) {
        // stat is unmodified
      } else {
        const isModifiedByWearables = Boolean(userWearableTraitBonuses[d.key]);
        const isModifiedByGotchiTraits = !isModifiedByWearables || updateObj.increase - userWearableTraitBonuses[d.key] > 0;
        if (isModifiedByWearables && !isModifiedByGotchiTraits) {
          updateObj.description += ' via Wearables';
        } else {
          updateObj.description += ` via ${updateObj.gotchiTraitModifierLabel}`;
          if (isModifiedByWearables) {
            updateObj.description += ` + ${userWearableTraitBonuses[d.key]} from Wearables`;
          }
        }
      }
      return updateObj;
    });
    setTraitsData(updatedData as TraitDetails[]);
  }, [userTraits, userTraitsBases, userWearableTraitBonuses]);

  const formatAlchemicaValue = (value: number) => {
    if (!value) return 0;
    return value.toFixed(value >= 1 ? 0 : 2);
  };

  const handleTooltipEnter = useCallback(() => {
    if (!isExtended) return;
    setTooltipVisible(true);
  }, [isExtended]);

  const handleTooltipLeave = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  const borderColor = useMemo(() => (isArena ? 'var(--col-yellow-100)' : 'var(--col-pink-350)'), [isArena]);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);

  useEffect(() => {
    setAvatarImgFailed(false);
  }, [selectedPlayer?.id, gotchiUrl?.url]);

  return (
    <>
      {selectedPlayer && !isTrueSpectator(selectedPlayer.isSpectator) && (
        <div className={`player-dashboard-component ${!isExtended ? 'short' : ''}`}>
          <span className={`gotchi-name ${isArena ? 'bg-yellow' : 'bg-pink'}`}>{selectedPlayer.name}</span>

          <div className="flex items-stretch justify-between relative">
            <div className="gotchi-traits-container flex relative" onMouseEnter={handleTooltipEnter} onMouseLeave={handleTooltipLeave}>
              <div className="image-wrapper">
                {/* Cartridge / soft-mint: always compose via GotchiSVG (same as select cards).
                    Mutated blob URLs from fetchAavegotchiURL often fail as <img> for haunt-2 compose. */}
                {gotchiUrl?.url &&
                !selectedPlayer.isCartridgeHero &&
                !selectedPlayer.cartridgeCollateral &&
                !avatarImgFailed ? (
                  <div style={{ height: '12rem', width: '12rem', position: 'relative' }}>
                    <Image
                      alt=""
                      src={gotchiUrl.url}
                      layout="fill"
                      objectFit="contain"
                      unoptimized={gotchiUrl.url.startsWith('blob:') || gotchiUrl.url.startsWith('data:')}
                      onError={() => setAvatarImgFailed(true)}
                    />
                  </div>
                ) : (
                  <GotchiSVG
                    tokenId={selectedPlayer.id}
                    height={12}
                    isSpectator={false}
                    equippedWearables={selectedPlayer.equippedWearables}
                    traits={selectedPlayer.withSetsNumericTraits}
                    cartridgeCollateral={selectedPlayer.cartridgeCollateral}
                    hauntId={selectedPlayer.hauntId}
                    sourceTokenId={selectedPlayer.cartridgeSourceTokenId}
                  />
                )}
              </div>
              <div className={`traits-wrapper  ${!isExtended ? 'short' : ''}`}>
                {_.map(
                  traitsData,
                  ({ icon, key, value, tooltip }) =>
                    !tooltip && (
                      <div className="trait-details" key={key}>
                        <div className="trait-icon">
                          <Image alt="" src={icon} objectFit="contain" />
                        </div>
                        <div className="trait-value">
                          <span className="value">{value}</span>
                        </div>
                      </div>
                    ),
                )}
              </div>
              <span className={`traits-spacer ${isExtended ? '' : 'short'}`} />
            </div>
            {/* Traits Tooltip */}
            <div
              className={isTooltipVisible ? 'tooltip-container visible' : 'tooltip-container'}
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >
              {_.map(traitsData, ({ icon, key, increase, description }) => (
                <div className="trait-details" key={key}>
                  <span className="trait-icon">
                    <Image alt="" src={icon} objectFit="contain" />
                  </span>
                  <span className="trait-value">
                    <span className="increase">
                      {' '}
                      +{increase} <span className="desc">{description} </span>
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className={`${isExtended ? 'visible' : 'hidden'}`}>
              <div className="info-container gradient-purple">
                <div className="flex items-center h-fit">
                  <div className="info-table">
                    {!selectedPlayer.isSpectator && (
                      <div className="alchemica-content">
                        <div className="lootbag-icon">
                          <Image alt="" src={LootBagIcon} layout="fill" />
                        </div>
                        <div className="carried-alchemica-content flex">
                          {_.map(['fud', 'fomo', 'alpha', 'kek'], (key) => {
                            return (
                              <div key={key} className="alchemica flex">
                                <div className="alchemica-item-image-wrapper">
                                  <Image alt="" src={getAlchemicaIcon(key)} layout="fill" objectFit="contain" />
                                </div>
                                <span className={`alchemica-value ${key}`}>
                                  {formatAlchemicaValue(alchemica?.[key] ? Number(alchemica[key]) : 0)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="total-collected-alchemica">
                          <div className="collected-alchemica">{formatAlchemicaValue(Number(alchemica?.total))}</div>
                          <div className="alchemica-carrying-capacity">/{formatAlchemicaValue(Number(userTraits?.alchemicaCarryingCapacity))}</div>
                        </div>
                      </div>
                    )}

                    <div className="hp-bar">
                      <HealthBar
                        iconData={{ icon: HeartIcon, width: 20, height: 20 }}
                        max={userTraits?.maxHealth}
                        current={health}
                        showNum
                        color="pink"
                        increase={`+${userTraits?.healthRegenAmount}`}
                      />
                    </div>
                    <div className="ap-bar">
                      <HealthBar
                        iconData={{ icon: LightningIcon, width: 20, height: 20 }}
                        max={userTraits?.maxAP}
                        current={userTraits?.ap}
                        color="info"
                        showNum
                        increase={`+${userTraits?.apRegenAmount}`}
                      />
                    </div>
                  </div>

                  {gameConfig.enableGotchiInventory && <QuickslotsGrid borderColor={borderColor} />}
                </div>
              </div>
            </div>

            <button type="button" className={`toggle-button clear ${isExtended ? '' : 'short'}`} onClick={() => setIsExtended(!isExtended)}>
              <ToggleIcon direction={`${isExtended ? 'right' : 'left'}`} size={2} fill={borderColor} />
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .player-dashboard-component {
          --border-color: ${borderColor};
        }
      `}</style>
      <style jsx>{styles}</style>
    </>
  );
};
