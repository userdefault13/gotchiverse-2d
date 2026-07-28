import Image from 'next/image';
import { GotchiLoading } from 'assets';
import { Portal } from 'components/utility/Portal';
import styles from './styles';

interface Props {
  open: boolean;
  label?: string;
  /** 0–100 */
  progress?: number;
}

export const MintGhostOverlay = ({ open, label = 'Minting…', progress = 0 }: Props): JSX.Element | null => {
  if (!open) return null;
  const pct = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));

  return (
    <Portal>
      <div className="mint-ghost-overlay" role="status" aria-live="polite" aria-busy="true">
        <div className="mint-ghost-gif">
          <Image alt="" src={GotchiLoading} width={88} height={88} unoptimized />
        </div>
        <p className="mint-ghost-label">{label}</p>
        <div className="mint-ghost-bar" aria-hidden="true">
          <div className="mint-ghost-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="mint-ghost-pct">{pct}%</p>
      </div>
      <style jsx>{styles}</style>
    </Portal>
  );
};
