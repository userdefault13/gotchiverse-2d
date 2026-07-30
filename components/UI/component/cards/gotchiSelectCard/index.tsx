import styles from './styles';
import Image from 'next/image';
import { GotchiverseAavegotchi } from 'types';
import { GotchiSVG } from 'components/UI/widgets';
import { BorrowedIcon, FreeTagIcon, GotchiLoading } from 'assets';

import { gotchiCanChannel } from 'helpers/parcels.helper';
import { useUser } from 'contexts/UserContext';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useGame } from 'contexts/GameContext';
import { ChannelReadyToggle } from 'components/UI/elements/buttons/channelReadyToggle';
import { brsToRarity } from 'helpers/gotchi.helper';
import { collateralFromSimId } from 'helpers/cartridgeHero.helper';
import { buildCollateralGotchiSvg, fetchCollateralGotchiBlobUrl } from 'helpers/collateralPreview';
import { convertInlineSVGToBlobURL } from 'helpers/aavegotchi';
import { traitNumber } from 'helpers/composeGotchi';
import { useWeb3 } from 'contexts/Web3Context';

interface Props {
  gotchi?: GotchiverseAavegotchi;
  handleSelect: (gotchi: GotchiverseAavegotchi) => void;
  isSelected: boolean;
}

export const GotchiSelectCard = ({ gotchi, handleSelect, isSelected }: Props): JSX.Element => {
  const { click, oops } = useAavegotchiSound();
  const isSpectator = gotchi?.isSpectator;
  const isLent = gotchi?.isLent;
  const isCartridgeHero = Boolean(gotchi?.isCartridgeHero);

  const [{ gameConfig }] = useGame();
  const [{ currentNetwork }] = useWeb3();
  const [{ parcelAccessOwners }] = useUser();
  const [isBlocked, setIsBlocked] = useState<boolean>(true);
  const [cartridgeBlobUrl, setCartridgeBlobUrl] = useState<string>('');

  useEffect(() => {
    if (!gotchi) return;
    if (gotchi.isCartridgeHero) {
      setIsBlocked(false);
      return;
    }
    setIsBlocked(!parcelAccessOwners.includes(gotchi.originalOwner.id.toLowerCase()));
  }, [parcelAccessOwners, gotchi]);

  const equipKey = useMemo(
    () => (gotchi?.equippedWearables || []).map((n) => Number(n) || 0).join(','),
    [gotchi?.equippedWearables],
  );
  const traitsKey = useMemo(() => {
    const t = gotchi?.withSetsNumericTraits || gotchi?.numericTraits || [];
    return t.map((n) => traitNumber(n, 50)).join(',');
  }, [gotchi?.withSetsNumericTraits, gotchi?.numericTraits]);
  const sourceTokenId = gotchi?.cartridgeSourceTokenId || undefined;
  const hauntId =
    gotchi?.hauntId === 1 || gotchi?.hauntId === 2 ? gotchi.hauntId : undefined;

  useEffect(() => {
    if (!isCartridgeHero || !gotchi?.cartridgeCollateral) {
      setCartridgeBlobUrl('');
      return;
    }
    const collateral = collateralFromSimId(gotchi.cartridgeCollateral);
    if (!collateral) return;
    // Instant recolor so haunt-2 cards never sit on GotchiLoading while compose/RPC runs.
    let createdUrl = convertInlineSVGToBlobURL(buildCollateralGotchiSvg(collateral));
    setCartridgeBlobUrl(createdUrl);
    let cancelled = false;
    const equipped = equipKey ? equipKey.split(',').map((n) => Number(n) || 0) : undefined;
    const traits = traitsKey ? traitsKey.split(',').map((n) => traitNumber(n, 50)) : undefined;
    void fetchCollateralGotchiBlobUrl(
      collateral,
      currentNetwork,
      equipped,
      traits,
      sourceTokenId,
      hauntId,
    )
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        if (createdUrl) URL.revokeObjectURL(createdUrl);
        createdUrl = url;
        setCartridgeBlobUrl(url);
      })
      .catch((err) => {
        console.warn('@GotchiSelectCard cartridge preview', gotchi?.name, err);
      });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [
    isCartridgeHero,
    gotchi?.cartridgeCollateral,
    equipKey,
    traitsKey,
    sourceTokenId,
    hauntId,
    currentNetwork,
  ]);

  const rarity = useMemo(
    () => 'gotchi-' + (gotchi?.isSpectator ? 'freebie' : brsToRarity(Number(gotchi?.baseRarityScore))),
    [gotchi],
  );

  const collateralColor = useMemo(() => {
    if (!isCartridgeHero) return undefined;
    return collateralFromSimId(gotchi?.cartridgeCollateral)?.primaryColor;
  }, [isCartridgeHero, gotchi?.cartridgeCollateral]);

  return (
    <>
      <div
        className={`gotchi-panel clickable ${rarity} ${isLent ? 'borrowed' : ''} ${
          isCartridgeHero ? 'cartridge-hero' : ''
        } ${gameConfig.gotchiverseTheme} ${isSelected ? 'selected' : ''}`}
        style={
          collateralColor
            ? ({
                '--border-color': collateralColor,
                '--label-bg-color': collateralColor,
              } as CSSProperties)
            : undefined
        }
        onClick={() => {
          if (!isBlocked) {
            click();
            handleSelect(gotchi);
          } else oops();
        }}
      >
        <div className="gotchi-img">
          <div className="icons">
            <span className={`top-right ${isSpectator ? 'free-tag' : ''}`}>
              {isSpectator && <Image alt="" src={FreeTagIcon} />}
              {isLent && <Image alt="" src={BorrowedIcon} />}
            </span>
            <span className="bottom-right">
              {!isSpectator && !isCartridgeHero && gotchiCanChannel(gotchi?.lastChanneledAlchemica) && (
                <ChannelReadyToggle
                  size="3rem"
                  active={gotchi?.readyToChannel}
                  backgroundColor={`var(--col-${rarity}-card-label-bg)`}
                />
              )}
            </span>
          </div>
          <div className={`gotchi-img-wrapper ${isSpectator ? 'spectator' : ''}`}>
            {isCartridgeHero ? (
              <div className="cartridge-hero-avatar">
                <Image
                  alt=""
                  src={cartridgeBlobUrl || GotchiLoading}
                  layout="fill"
                  objectFit="contain"
                  unoptimized={!!cartridgeBlobUrl}
                />
              </div>
            ) : (
              <GotchiSVG
                height={gotchi?.isSpectator ? 10 : 12}
                tokenId={gotchi?.id}
                options={{ removeBg: true }}
                isSpectator={isSpectator}
              />
            )}
          </div>
        </div>
        <p className="gotchi-name">{gotchi?.name}</p>
      </div>
      <style jsx>{`
        .gotchi-panel {
          --border-color: var(--col-${rarity}-card-border);
          --label-bg-color: var(--col-${rarity}-card-label-bg);
          --box-inner-bg: var(--col-${rarity}-card-bg);
          --box-inner-shadow: var(--col-${rarity}-card-inner-shadow);
        }
        .cartridge-hero-avatar {
          position: relative;
          width: 10rem;
          height: 10rem;
        }
      `}</style>
      <style jsx>{styles}</style>
    </>
  );
};
