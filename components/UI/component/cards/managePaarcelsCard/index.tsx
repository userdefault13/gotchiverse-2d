import styles from './styles';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { SoftCText } from 'components/UI/widgets';

interface Props {
  isSelected?: boolean;
  onClick?: () => void;
}

export const ManagePaarcelsCard = ({ isSelected, onClick }: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const handleClick = () => {
    click();
    onClick?.();
  };

  return (
    <>
      <div
        className={`gotchi-panel clickable paarcels ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
      >
        <div className="gotchi-img">
          <div className="gotchi-img-wrapper">
            <div className="paarcels-icon" aria-hidden>
              <span className="land">▣</span>
            </div>
          </div>
        </div>
        <p className="gotchi-name">
          <SoftCText>cPaarcels</SoftCText>
        </p>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
