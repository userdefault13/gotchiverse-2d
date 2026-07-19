import styles from './styles';
import Image from 'next/image';
import { getAlchemicaIcon, nFormatter } from 'helpers/functions';
import { useGame } from 'contexts/GameContext';
interface Props {
  total: number[];
  rates: number[];
  capacities: number[];
}

export const AlchemicaStats = ({ total, rates, capacities }: Props): JSX.Element => {
  const alchemicas = ['fud', 'fomo', 'alpha', 'kek'];
  const [{ gameConfig }] = useGame();

  return (
    <>
      <div className={`status-container ${gameConfig.gotchiverseTheme}`}>
        <div className="title-container">STATS</div>
        <div className="alchemica-container">
          {alchemicas.map((alchemica, index) => (
            <div className="icon-container" key={index}>
              <Image alt="" src={getAlchemicaIcon(alchemica, gameConfig.gotchiverseTheme)} layout="fill" objectFit="contain" />
            </div>
          ))}
        </div>
        <div className="balances-container">
          <div className="status-row">
            <div className="label">Total claimed</div>
            <div className="balances">
              {alchemicas.map((key, index) => (
                <span key={key} className={`${key}`}>
                  {!isNaN(total?.[index]) ? nFormatter(total[index], 2) : 0}
                </span>
              ))}
            </div>
          </div>
          <div className="status-row">
            <div className="label">Harvest / Day</div>
            <div className="balances">
              {alchemicas.map((key, index) => (
                <span key={key} className={`${key}`}>
                  {!isNaN(rates?.[index]) ? rates[index] : 0}
                </span>
              ))}
            </div>
          </div>
          <div className="status-row">
            <div className="label">Reservoirs Capacity</div>
            <div className="balances">
              {alchemicas.map((key, index) => (
                <span key={key} className={`${key}`}>
                  {!isNaN(capacities?.[index]) ? capacities[index] : 0}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
