import styles from './styles';
import Image from 'next/image';
import { GotchiverseBaseCartridge, GotchiverseBtcCartridge, GotchiverseRhCartridge } from 'assets';
import useAavegotchiSound from 'hooks/useAavegotchiSound';

interface Props {
  network?: string;
  isSelected?: boolean;
  hasCartridge?: boolean;
  onClick?: () => void;
}

function cartridgeArtForNetwork(network?: string) {
  if (network === 'robinhood') return GotchiverseRhCartridge;
  if (network === 'bitcoin') return GotchiverseBtcCartridge;
  return GotchiverseBaseCartridge;
}

export const MintCartridgeCard = ({ network, isSelected, hasCartridge, onClick }: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const isRobinhood = network === 'robinhood';
  const isBitcoin = network === 'bitcoin';
  const cartridgeImg = cartridgeArtForNetwork(network);
  const trackClass = isRobinhood ? 'rh' : isBitcoin ? 'btc' : 'base';
  // Manage mode selected → Exit (toggle off); otherwise Manage / Mint Cartridge.
  const label = hasCartridge ? (isSelected ? 'Exit' : 'Manage') : 'Mint Cartridge';

  const handleClick = () => {
    click();
    onClick?.();
  };

  return (
    <>
      <div
        className={`gotchi-panel clickable ${trackClass} ${hasCartridge ? 'manage' : 'mint'} ${
          isSelected ? 'selected' : ''
        }`}
        onClick={handleClick}
      >
        <div className="gotchi-img">
          <div className="gotchi-img-wrapper">
            <div className="cartridge-img">
              <Image alt={label} src={cartridgeImg} layout="fill" objectFit="contain" />
            </div>
          </div>
        </div>
        <p className="gotchi-name">{label}</p>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
