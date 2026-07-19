/* eslint-disable multiline-ternary */
import styles from './styles';
import { TabView, TabsBase } from 'components/UI/elements';
import { useMemo } from 'react';
import {
  calculatePercentage,
  getGotchiTraitObjectByIndex,
  getKinshipLevel,
  getRarityType,
  renderSpiritForce,
  renderTraitValue,
} from 'helpers/gotchi.helper';
import Image from 'next/image';
import _ from 'lodash';
import { getAlchemicaIcon, nFormatter } from 'helpers/functions';
import {
  InGameArmorPointIcon,
  InGameAttackRateIcon,
  InGameHPRegenIcon,
  InGameEvadeRateIcon,
  InGameMeleeDmgIcon,
  InGameRangedDmgIcon,
  InGameMaxHPIcon,
  InGameMaxAPIcon,
  InGameAPRegenIcon,
  InGameCapacityIcon,
} from 'assets/icons';
import { GotchiStat } from './GotchiStat';
import { useRealm } from 'contexts/RealmContext';
import type { GotchiverseAavegotchi } from 'types';

interface Props {
  gotchi: GotchiverseAavegotchi;
}

export const GotchiDetailsPanel = ({ gotchi }: Props): JSX.Element => {
  const [{ onChainWallet }] = useRealm();

  const percentageStyle = useMemo(
    () => ({
      width: gotchi ? calculatePercentage(Number(gotchi.level), Number(gotchi.experience)) + '%' : '0',
    }),
    [gotchi],
  );
  const kingshipLevel = useMemo(() => (gotchi ? getKinshipLevel(Number(gotchi.kinship)) : 0), [gotchi.kinship]);
  const alchemicaArray = ['FUD', 'FOMO', 'ALPHA', 'KEK'];
  const totalAlchemica = useMemo(() => {
    if (!gotchi?.alchemica) return 0;
    let total = 0;
    alchemicaArray.forEach((key) => {
      total += Number(gotchi?.alchemica?.[key]);
    });
    return total;
  }, [gotchi?.alchemica]);

  const totalAlchemicaCapacity = useMemo(() => {
    if (!gotchi?.alchemicaCarryingCapacity) return 0;
    return nFormatter(Number(gotchi?.alchemicaCarryingCapacity ?? 0), 2);
  }, [gotchi?.alchemicaCarryingCapacity]);

  const getAlchemicaAmount = (key: string): string | 0 => {
    if (!gotchi?.alchemica) return 0;
    const value = gotchi?.alchemica?.[key] ? Number(gotchi?.alchemica?.[key]) : 0;
    return nFormatter(value, 2);
  };

  const getOnChainAlchemicaAmount = (key: string): string | 0 => {
    if (!onChainWallet?.[key]) return 0;
    const value = onChainWallet?.[key] ? Number(onChainWallet?.[key]) : 0;
    return nFormatter(value, 2);
  };

  return (
    <>
      {
        <>
          <div className="header">
            <div className="level-info">
              <h4>Level {gotchi.isSpectator ? 0 : gotchi.level}</h4>
              {!gotchi.isSpectator && <span className="info">{gotchi.experience?.toString()} xp</span>}
            </div>
            <div className="xp-bar">
              <div className="progress" style={percentageStyle} />
            </div>
            <div className="row">
              <div className="fade-container">
                <h5 className="label">Rarity:</h5>
                <p>{gotchi.isSpectator ? '1 (1)' : `${gotchi.withSetsRarityScore} (${gotchi.baseRarityScore})`}</p>
              </div>
              <div className="fade-container">
                <h5 className="label">Kinship:</h5>
                <p>
                  {kingshipLevel} ({gotchi.isSpectator ? 0 : gotchi.kinship})
                </p>
              </div>
              <div className="fade-container">
                <h5 className="label">Spirit Force:</h5>
                <p>{gotchi.isSpectator ? '-' : renderSpiritForce(gotchi.stakedAmount, gotchi.collateral)}</p>
              </div>
            </div>
          </div>

          <div className="description-container scrollable hidden">
            {gotchi.isSpectator ? (
              <TabsBase>
                <TabView title="Description">
                  <div className="description">
                    <p className="info">
                      Experience the Gotchiverse and Aarena without owning an Aavegotchi. Freebie can do everything a normal Aavegotchi can, except
                      pick up tokens.
                    </p>
                    <p className="info">For that, you&apos;ll need the real thing!</p>
                    <p className="subtitle">Feel free to take a look at the Gotchiverse, fren!</p>
                  </div>
                </TabView>
              </TabsBase>
            ) : (
              <TabsBase>
                <TabView title="In-Game">
                  <div className="in-game-container">
                    <div className="col">
                      <GotchiStat icon={InGameMaxHPIcon} label="Max HP" value={Number(gotchi.maxHealth) || 0} />
                      <GotchiStat icon={InGameMaxAPIcon} label="Max AP" value={Number(gotchi.maxAP) || 0} />
                      <GotchiStat icon={InGameHPRegenIcon} label="HP Regen" value={Number(gotchi.healthRegenAmount) || 0} />
                      <GotchiStat icon={InGameAPRegenIcon} label="AP Regen" value={Number(gotchi.apRegenAmount) || 0} />
                      <GotchiStat icon={InGameCapacityIcon} label="Capacity" value={Number(gotchi.alchemicaCarryingCapacity) || 0} />
                    </div>
                    <div className="col">
                      <GotchiStat icon={InGameAttackRateIcon} label="Attack Rate" value={Number(gotchi.attackSpeed) || 0} />
                      <GotchiStat icon={InGameEvadeRateIcon} label="Evade Rate" value={Number(gotchi.evasion) || 0} />
                      <GotchiStat
                        icon={InGameMeleeDmgIcon}
                        label="Melee DMG"
                        value={(Number(gotchi.meleePower) || 0) + Number(gotchi.wearableTraitBonuses?.meleePower?.toFixed?.() || gotchi.wearableTraitBonuses?.meleePower || 0)}
                      />
                      <GotchiStat
                        icon={InGameRangedDmgIcon}
                        label="Ranged DMG"
                        value={(Number(gotchi.rangedPower) || 0) + Number(gotchi.wearableTraitBonuses?.rangedPower?.toFixed?.() || gotchi.wearableTraitBonuses?.rangedPower || 0)}
                      />
                      <GotchiStat icon={InGameArmorPointIcon} label="Armor Point" value={Number(gotchi.defense) || 0} />
                    </div>
                  </div>
                  <div className="alchemica-content">
                    <div className="carried-alchemica-content">
                      {_.map(alchemicaArray, (key) => (
                        <div key={key} className="alchemica">
                          <span className="alchemica-icon">
                            <Image alt="" src={getAlchemicaIcon(key.toLowerCase())} objectFit="contain" />
                          </span>
                          <span className={`alchemica-value ${key.toLowerCase()}`}>{Number(getAlchemicaAmount(key)).toFixed()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="collected-alchemica">
                      <span>{Number(totalAlchemica).toFixed()}</span>
                      <br />
                      {`/${totalAlchemicaCapacity}`}
                    </div>
                  </div>
                </TabView>
                <TabView title="On-Chain">
                  <div className="on-chain-container">
                    {gotchi.numericTraits.map((value, i) => {
                      return (
                        <div className="trait" key={i}>
                          <h5 className="label">{getGotchiTraitObjectByIndex(i).value}</h5>
                          <span className="icon">{getGotchiTraitObjectByIndex(i).icon}</span>
                          <p className="value">{renderTraitValue(value, gotchi.withSetsNumericTraits?.[i] || gotchi.numericTraits?.[i] || 0)}</p>
                          <p className="name">{getRarityType(gotchi.withSetsNumericTraits?.[i] || gotchi.numericTraits?.[i] || 0)}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="alchemica-content">
                    <div className="carried-alchemica-content noclip">
                      {_.map(alchemicaArray, (key) => (
                        <div key={key} className="alchemica">
                          <span className="alchemica-icon">
                            <Image alt="" src={getAlchemicaIcon(key.toLowerCase())} objectFit="contain" />
                          </span>
                          <span className={`alchemica-value ${key.toLowerCase()}`}>{getOnChainAlchemicaAmount(key)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabView>
              </TabsBase>
            )}
          </div>
        </>
      }
      <style jsx>{styles}</style>
    </>
  );
};
