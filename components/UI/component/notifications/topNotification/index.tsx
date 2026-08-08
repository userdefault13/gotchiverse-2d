import styles from './styles';

interface Props {
  children: React.ReactNode;
  /** Border / glow accent — BTC soft track uses orange. */
  accent?: 'purple' | 'btc';
}

export const TopNotification = ({ children, accent = 'purple' }: Props): JSX.Element => {
  return (
    <>
      <div className={`notification-container${accent === 'btc' ? ' btc' : ''}`}>{children}</div>
      <style jsx>{styles}</style>
    </>
  );
};
