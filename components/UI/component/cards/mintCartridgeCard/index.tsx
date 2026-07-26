import styles from './styles';
import Image from 'next/image';
import { GotchiverseBaseCartridge, GotchiverseRhCartridge } from 'assets';
import useAavegotchiSound from 'hooks/useAavegotchiSound';

interface Props {
  network?: string;
  isSelected?: boolean;
  hasCartridge?: boolean;
  onClick?: () => void;
}

export const MintCartridgeCard = ({ network, isSelected, hasCartridge, onClick }: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const isRobinhood = network === 'robinhood';
  const cartridgeImg = isRobinhood ? GotchiverseRhCartridge : GotchiverseBaseCartridge;
  const label = hasCartridge ? 'Manage' : 'Mint Cartridge';

  const handleClick = () => {
    click();
    onClick?.();
  };

  return (
    <>
      <div
        className={`gotchi-panel clickable ${isRobinhood ? 'rh' : 'base'} ${hasCartridge ? 'manage' : 'mint'} ${
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
