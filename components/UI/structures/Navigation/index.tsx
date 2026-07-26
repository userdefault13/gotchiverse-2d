import { LogoBase, LogoRh, SettingsIcon2, VerifyIcon } from 'assets';
import { SettingsModal } from 'components/UI/screens/section';
import { GameGuide } from 'components/UI/widgets/GameGuide';
import { useUserWalletDataContext } from 'components/utility/WalletConnect';
import { useUser } from 'contexts/UserContext';
import { useWeb3 } from 'contexts/Web3Context';
import { gotchiverseLinks } from 'data/links';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import Image from 'next/image';
import router, { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Web3Button } from '../../elements/buttons';
import styles from './styles';

export const Navigation = (): JSX.Element => {
  const links = [
    { label: 'Aavegotchi', link: gotchiverseLinks.aavegotchi.aavegotchi },
    { label: 'Blog', link: gotchiverseLinks.aavegotchi.blog },
    { label: 'Baazaar', link: gotchiverseLinks.aavegotchi.baazar },
  ];
  const [{ currentAccount, currentNetwork }] = useWeb3();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { click } = useAavegotchiSound();
  const { disconnectWallet } = useUserWalletDataContext();
  const [{ isVerified }] = useUser();

  const { query } = useRouter();

  const handleLogout = () => {
    click();
    disconnectWallet();
  };

  const onSettings = () => {
    click();
    setSettingsModalOpen(true);
  };

  useEffect(() => {
    if (query.settingsOpen === 'true') setSettingsModalOpen(true);
  }, []);

  const isRobinhood = currentNetwork === 'robinhood';
  const brandLogo = isRobinhood ? LogoRh : LogoBase;

  return (
    <>
      <nav className={`navigation-container${isRobinhood ? ' rh' : ''}`}>
        <nav className="navigation-content flex">
          <div className="logo-container">
            <div className="logo-wrapper" onClick={async () => await router.push('/')}>
              <Image alt="" src={brandLogo} layout="fill" />
            </div>
            <GameGuide color="info" />
          </div>
          <div className="link-container">
            {links.map(({ label, link }, index) => (
              <a className="text-link" key={index} href={link} target={'_blank'} rel="noreferrer">
                {label}
              </a>
            ))}
          </div>
        </nav>

        <div className="settings-container">
          <Web3Button user={currentAccount} handleLogout={handleLogout} jazzicon network={currentNetwork} color="info" />
          <div className="setting-button-container" onClick={onSettings}>
            <Image alt="" src={SettingsIcon2} layout="fill" />
            {!isVerified && isVerified !== undefined && (
              <div className="verify-icon">
                <Image alt="" src={VerifyIcon} width={24} height={24} />
              </div>
            )}
          </div>
        </div>
      </nav>
      <SettingsModal open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />

      <style jsx>{styles}</style>
    </>
  );
};
