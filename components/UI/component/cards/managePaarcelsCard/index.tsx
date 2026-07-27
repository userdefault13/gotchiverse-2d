import styles from './styles';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { SoftCText } from 'components/UI/widgets';

interface Props {
  isSelected?: boolean;
  /** When true, card flips to switch back to cAavegotchi manage. */
  manageCaavegotchis?: boolean;
  onClick?: () => void;
}

export const ManagePaarcelsCard = ({
  isSelected,
  manageCaavegotchis = false,
  onClick,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const handleClick = () => {
    click();
    onClick?.();
  };

  return (
    <>
      <div
        className={`gotchi-panel clickable paarcels ${manageCaavegotchis ? 'switch-caave' : ''} ${
          isSelected ? 'selected' : ''
        }`}
        onClick={handleClick}
      >
        <div className="gotchi-img">
          <div className="gotchi-img-wrapper">
            <div className="paarcels-icon" aria-hidden>
              <span className="land">{manageCaavegotchis ? '◀' : '▣'}</span>
            </div>
          </div>
        </div>
        <p className="gotchi-name">
          {manageCaavegotchis ? (
            <>
              <span className="title-lead">Manage</span>{' '}
              <SoftCText>cAavegotchis</SoftCText>
            </>
          ) : (
            <SoftCText>cPaarcels</SoftCText>
          )}
        </p>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
