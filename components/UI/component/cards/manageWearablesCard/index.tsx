import styles from './styles';
import useAavegotchiSound from 'hooks/useAavegotchiSound';

interface Props {
  isSelected?: boolean;
  onClick?: () => void;
}

export const ManageWearablesCard = ({ isSelected, onClick }: Props): JSX.Element => {
  const { click } = useAavegotchiSound();

  const handleClick = () => {
    click();
    onClick?.();
  };

  return (
    <>
      <div
        className={`gotchi-panel clickable wearables ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
      >
        <div className="gotchi-img">
          <div className="gotchi-img-wrapper">
            <div className="wearables-icon" aria-hidden>
              <span className="gear">⚙</span>
            </div>
          </div>
        </div>
        <p className="gotchi-name">cWearables</p>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
