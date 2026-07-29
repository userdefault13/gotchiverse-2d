import styles from '../manageWearablesCard/styles';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { SoftCText } from 'components/UI/widgets';

interface Props {
  isSelected?: boolean;
  manageCaavegotchis?: boolean;
  onClick?: () => void;
}

export const ManageInstallationsCard = ({
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
        className={`gotchi-panel clickable wearables ${manageCaavegotchis ? 'switch-caave' : ''} ${
          isSelected ? 'selected' : ''
        }`}
        onClick={handleClick}
      >
        <div className="gotchi-img">
          <div className="gotchi-img-wrapper">
            <div className="wearables-icon" aria-hidden>
              <span className="gear">{manageCaavegotchis ? '◀' : '▣'}</span>
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
            <SoftCText>cInstallations</SoftCText>
          )}
        </p>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
