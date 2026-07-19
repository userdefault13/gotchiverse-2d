import { WalletIcon } from 'assets';
import { BasePanel, IndentedPanel } from 'components/UI/component';
import Image from 'next/image';
import styles from './styles';

interface Props {
  onClick: () => void;
  clickable?: boolean;
}

export const WalletConnectButton = ({ onClick, clickable = true }: Props): JSX.Element => {
  const handleClick = () => {
    clickable && onClick && onClick();
  };
  return (
    <>
      <div className={`wallet-connect flex ${clickable ? 'clickable' : ''}`} onClick={handleClick}>
        <div className="icon-container">
          <Image alt="" src={WalletIcon} width={176} height={176} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
        </div>
        <div className="button-container">
          <BasePanel
            inherit={{
              width: true,
              height: true,
            }}
            hideSides={{ left: true }}
            sides={{
              color: 'purple-border',
              thickness: 4,
              top: 10,
              right: 10,
              bottom: 10,
            }}
            background={{
              shadow: 'wallet-connect-button',
              color: 'grad-info-2',
              hasShadow: true,
              scanlines: {
                color: 'yellow-50',
                opacity: 0.1,
                spacing: 0.75,
                size: 0.18,
              },
              opacity: 1,
            }}
            content={{
              padding: 0.4,
              color: 'info-800',
            }}
          >
            <div className="name">CONNECT YOUR WALLET</div>
          </BasePanel>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
