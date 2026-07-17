import { DiscordIcon, TwitterIcon, YoutubeIcon } from 'assets';
import { gotchiverseLinks } from 'data/links';
import Image from 'next/image';
import { ArrowIcon } from '../svgs';
import styles from './styles';

export const SocialLinks = (): JSX.Element => {
  const { social: socialLink } = gotchiverseLinks;
  const socials = [
    {
      key: 'youtube',
      icon: YoutubeIcon,
    },
    {
      key: 'twitter',
      icon: TwitterIcon,
    },
    {
      key: 'discord',
      icon: DiscordIcon,
    },
  ];
  return (
    <>
      <div className="social-container">
        <ArrowIcon fill="var(--col-info-800)" width="3.5rem" height="5.6rem" dir="right" />
        <ArrowIcon fill="var(--col-info-800)" width="3.5rem" height="5.6rem" dir="right" />
        <div className="link-container">
          <div className="title">Join the #gotchigang!</div>
          <div className="links">
            {socials.map(({ key, icon }, index) => (
              <a href={socialLink[key]} key={index} target="_blank" rel="noreferrer" className="link">
                <Image alt="" src={icon} layout="fill" />
              </a>
            ))}
          </div>
        </div>
        <ArrowIcon fill="var(--col-info-800)" width="3.5rem" height="5.6rem" dir="left" />
        <ArrowIcon fill="var(--col-info-800)" width="3.5rem" height="5.6rem" dir="left" />
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
