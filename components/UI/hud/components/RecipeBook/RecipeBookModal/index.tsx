import { Candle1, Candle1Small, Candle2, Candle2Right, Candle2Small, Candle3Narrow, PumpkinLeft, PumpkinRight } from 'assets';
import { ModalWrapper } from 'components/UI/component';
import { CloseButton } from 'components/UI/elements';
import { useGame } from 'contexts/GameContext';
import Image from 'next/image';
import styles from './styles';

export type RecipeBookPage = {
  id: string;
  label: string;
  shortLabel: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  pages: RecipeBookPage[];
  activePage: number;
  onPageChange: (index: number) => void;
}

export const RecipeBookModal = ({ open, onClose, children, pages, activePage, onPageChange }: Props): JSX.Element => {
  const [{ gameConfig }] = useGame();

  const goPrev = () => onPageChange(Math.max(0, activePage - 1));
  const goNext = () => onPageChange(Math.min(pages.length - 1, activePage + 1));

  return (
    <>
      <ModalWrapper open={open} onClose={onClose} fullWidth useHalloween>
        <div className={`wrapper ${gameConfig.gotchiverseTheme}`}>
          <div className="close-icon-container">
            <CloseButton onClick={onClose} color={gameConfig.gotchiverseTheme} />
          </div>
          {gameConfig.gotchiverseTheme === 'halloween' && (
            <>
              <div className="candle-layer-1 left">
                <Image alt="" src={Candle3Narrow} layout="fill" />
              </div>
              <div className="candle-layer-1 right">
                <Image alt="" src={Candle2} layout="fill" />
              </div>
              <div className="candle-layer-2 left">
                <Image alt="" src={Candle2} layout="fill" />
              </div>
              <div className="candle-layer-2 left">
                <Image alt="" src={Candle2} layout="fill" />
              </div>
              <div className="candle-layer-2 right">
                <Image alt="" src={Candle1Small} layout="fill" />
              </div>
            </>
          )}

          <div className="inner-container" onClick={(e) => e.stopPropagation()}>
            <div className="title-panel">
              <div className="title-panel-contents">
                {gameConfig.gotchiverseTheme === 'halloween' && (
                  <>
                    <div className="candle-top left">
                      <Image alt="" src={Candle2} layout="fill" objectFit="cover" />
                    </div>
                    <div className="candle-top right">
                      <Image alt="" src={Candle2Right} layout="fill" objectFit="cover" />
                    </div>
                  </>
                )}
                <h2>{pages[activePage]?.label || 'RECIPES BOOK'}</h2>
                {pages.length > 1 ? <p className="page-subtitle">{pages[activePage]?.shortLabel}</p> : null}
              </div>
            </div>
            <span className="divider" />
            {children}
            <span className="bottom-notch" />
            <button type="button" className="next-page-left page-flap" aria-label="Previous recipe page" onClick={goPrev} disabled={activePage <= 0} />
            <button
              type="button"
              className="next-page-right page-flap"
              aria-label="Next recipe page"
              onClick={goNext}
              disabled={activePage >= pages.length - 1}
            />
            <span className="back-bottom-notch" />
            <div className="back-left-page page-tab">
              <div className="page-dots" role="tablist" aria-label="Recipe book pages">
                {pages.map((page, index) => (
                  <button
                    key={page.id}
                    type="button"
                    role="tab"
                    aria-selected={index === activePage}
                    aria-label={page.shortLabel}
                    title={page.shortLabel}
                    className={`page-dot ${index === activePage ? 'active' : ''}`}
                    onClick={() => onPageChange(index)}
                  />
                ))}
              </div>
            </div>
            <span className="back-right-page" />
            <span className="back-left-page-bottom" />
            <span className="back-right-page-bottom" />
            {gameConfig.gotchiverseTheme === 'halloween' && (
              <>
                <div className="pumpkin-bottom left">
                  <Image alt="" src={PumpkinLeft} layout="fill" />
                </div>
                <div className="pumpkin-bottom right">
                  <Image alt="" src={PumpkinRight} layout="fill" />
                </div>
                <div className="candle-bottom left">
                  <Image alt="" src={Candle2Small} layout="fill" />
                </div>
                <div className="candle-bottom right">
                  <Image alt="" src={Candle1} layout="fill" />
                </div>
              </>
            )}
          </div>
        </div>
      </ModalWrapper>
      <style jsx>{styles}</style>
    </>
  );
};
