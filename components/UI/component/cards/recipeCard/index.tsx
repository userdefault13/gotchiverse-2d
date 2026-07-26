import styles from './styles';
import { Recipe } from 'types';
import { numberWithCommas } from 'helpers/ethers.helper';
import { getOnChainAlchemicaIcon } from 'helpers/functions';
import Image from 'next/image';
import { InstallationDisplayImg } from 'components/UI/elements';
import { useGame } from 'contexts/GameContext';

interface Props {
  recipe: Recipe;

  onClick: (e: Recipe) => void;
}

export const RecipeCard = ({ recipe, onClick }: Props): JSX.Element => {
  const [{ gameConfig }] = useGame();

  // Match inventory cards — drop "Level N" so long names (e.g. Gotchi Lodge) fit one line.
  const displayName = recipe.name.split('Level')[0].trim();

  // const formatTimeLeft = (date: Date) => {
  //   const now = new Date();
  //   const secondsLeft = (date.valueOf() - now.valueOf()) / 1000;

  //   const secondsPerDay = 86400;
  //   const days = Math.floor(secondsLeft / secondsPerDay);

  //   if (days) return `${days} days left!`;

  //   const secondsPerHour = 3600;
  //   const hours = Math.floor((secondsLeft % secondsPerDay) / secondsPerHour);

  //   if (hours) return `${hours} hours left!`;
  //   return '< 1 hour left!';
  // };

  return (
    <>
      <div className={`recipe ${recipe.endDate ? 'limited-edition' : ''} ${gameConfig.gotchiverseTheme}`} onClick={() => onClick(recipe)}>
        <div className="card-container">
          <div className="img-container">
            <InstallationDisplayImg type={recipe.type} itemId={recipe.id} installationScale={0.8} />
          </div>
          {/* {recipe.endDate && (
            <div className="end-time">
              <Image alt="" src={ClockIcon} width={16} height={16} />
              <p>{formatTimeLeft(recipe.endDate)}</p>
            </div>
          )} */}
          <div className="name-container">
            <p>{displayName}</p>
          </div>
        </div>
        <div className="ingredients-container">
          {Object.keys(recipe.ingredients).map((alchemica, i) => (
            <div key={i} className="ingredient">
              <Image alt="" src={getOnChainAlchemicaIcon(alchemica)} width={32} height={32} />
              <p>{numberWithCommas(recipe.ingredients[alchemica])}</p>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
