import React from 'react';
import { BookIcon } from 'assets';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import styles from './styles';
import Image from 'next/image';
import { useGame } from 'contexts/GameContext';

interface Props {
  onClick: () => void;
  disabled: boolean;
}

export const RecipeBookToggle = ({ onClick, disabled }: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const [{ gameConfig }] = useGame();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    click();
    onClick();
  };
  return (
    <>
      <button className={`toggle-button ${gameConfig.gotchiverseTheme}`} onClick={handleClick} disabled={false}>
        <div className="icon-container">
          <span>
            <Image alt="" src={BookIcon} height={52} width={36} />
          </span>
        </div>
        <div className="right-cap"></div>
        Recipe Book
      </button>
      <style jsx>{styles}</style>
    </>
  );
};
