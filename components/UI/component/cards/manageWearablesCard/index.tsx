import styles from './styles';
import useAavegotchiSound from 'hooks/useAavegotchiSound';

interface Props {
  isSelected?: boolean;
  /** When true, card flips to switch back to cAavegotchi manage. */
  manageCaavegotchis?: boolean;
  onClick?: () => void;
}

export const ManageWearablesCard = ({
  isSelected,
  manageCaavegotchis = false,
  onClick,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const label = manageCaavegotchis ? 'Manage cAavegotchis' : 'cWearables';

  const handleClick = () => {
    click();
    onClick?.();
  };

  return (
    <>
      <div
        className={`gotchi-panel clickable wearables ${manageCaavegotchis ? 'switch-caave' : ''} ${
          isSelected ? 'selected' : ''
        }`}
        onClick={handleClick}
      >
        <div className="gotchi-img">
          <div className="gotchi-img-wrapper">
            <div className="wearables-icon" aria-hidden>
              <span className="gear">{manageCaavegotchis ? '◀' : '⚙'}</span>
            </div>
          </div>
        </div>
        <p className="gotchi-name">{label}</p>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
