import { AarcadeLogo, CompanyLogo } from 'assets';
import { gotchiverseLinks } from 'data/links';
import Image from 'next/image';
import styles from './styles';

export const Footer = (): JSX.Element => {
  const sections = [
    {
      key: 'aavegotchi',
      label: 'Aarcade',
      links: [
        {
          name: 'aavegotchi',
          label: 'Gotchiverse',
        },
        {
          name: 'ghst',
          label: 'Get GHST',
        },
        {
          name: 'baazar',
          label: 'Aarcade Baazaar',
        },
        {
          name: 'white_paper',
          label: 'White Paper',
        },
      ],
    },
    {
      key: 'governance',
      label: 'Governance',
      links: [
        {
          name: 'forum',
          label: 'Forum',
        },
        {
          name: 'treasury',
          label: 'Treasury',
        },
        {
          name: 'vote',
          label: 'Vote',
        },
      ],
    },
    {
      key: 'social',
      label: 'Join Us',
      links: [
        {
          name: 'discord',
          label: 'Discord',
        },
        {
          name: 'twitter',
          label: 'Twitter',
        },
        {
          name: 'youtube',
          label: 'Youtube',
        },
      ],
    },
  ];

  return (
    <>
      <footer className="footer-container">
        <div className="stewards-block">
          <div className="stewards-row">
            <div className="steward-column">
              <div className="logo-container">
                <Image alt="Pixelcraft Studios" src={CompanyLogo} fill style={{ objectFit: 'contain' }} />
              </div>
              <div className="heading">Original Stewards</div>
              <div className="legal">Pixelcraft Studios — inception steward.</div>
            </div>
            <div className="steward-column">
              <div className="logo-container">
                <Image alt="Aarcade GHST" src={AarcadeLogo} fill style={{ objectFit: 'contain' }} />
              </div>
              <div className="heading">Future Maintainers</div>
              <div className="legal">AarcadeGhst — <br></br> continuing maintenance.</div>
            </div>
          </div>
          <div className="section legal-links">
            <a className="link" href={gotchiverseLinks.aarcade.home} target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            <a className="link" href={gotchiverseLinks.aarcade.home} target="_blank" rel="noreferrer">
              Terms of Service
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-20 gap-y-10 lg:grid-cols-3">
          {sections.map(({ key, label, links }, index) => (
            <div className="section" key={index}>
              <div className="heading">{label}</div>
              {links.map(({ name, label: linkLabel }, linkIndex) => (
                <a key={linkIndex} href={gotchiverseLinks[key][name]} target="_blank" rel="noreferrer" className="link">
                  {linkLabel}
                </a>
              ))}
            </div>
          ))}
        </div>
      </footer>
      <style jsx>{styles}</style>
    </>
  );
};
