import styles from './styles';
import { Button } from 'components/UI/elements';
import useAavegotchiSound from 'hooks/useAavegotchiSound';

interface Props {
  network?: string;
  onMint: () => void | Promise<void>;
  minting?: boolean;
  mintError?: string | null;
}

export const CartridgeMintPanel = ({
  network,
  onMint,
  minting = false,
  mintError = null,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const chainLabel =
    network === 'robinhood' ? 'Robinhood' : network === 'bitcoin' ? 'Bitcoin' : 'Base';

  const handleMint = () => {
    if (minting) return;
    click();
    void onMint();
  };

  return (
    <>
      <div className="cartridge-mint-panel">
        <h2 className="panel-title">Mint Cartridge</h2>
        <p className="panel-caption">
          Soft-launch Gotchiverse cartridge. Mint is free — then pick a cAavegotchi spirit to bind.
        </p>

        <div className="detail-rows">
          <div className="detail-row">
            <span className="detail-label">Game</span>
            <span className="detail-value">Gotchiverse</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Network</span>
            <span className="detail-value">{chainLabel}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Price</span>
            <span className="detail-value free">Free</span>
          </div>
        </div>

        <div className="mint-cta">
          <Button size={2.4} fullWidth onClick={handleMint} disabled={minting}>
            {minting ? 'Minting…' : 'Mint Cartridge'}
          </Button>
          {mintError ? <p className="mint-error">{mintError}</p> : null}
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
