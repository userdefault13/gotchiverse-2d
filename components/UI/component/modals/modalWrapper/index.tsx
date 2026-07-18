import { Portal } from 'components/utility/Portal';
import React, { useCallback, useEffect } from 'react';
import styles from './styles';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import Image from 'next/image';
import { SpiderWebDark } from 'assets';
import { useGame } from 'contexts/GameContext';

interface Props {
  open: boolean;
  onClose: () => void;
  fullWidth?: boolean;
  useHalloween?: boolean;
  light?: boolean;
  hideClose?: boolean;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
}

export const ModalWrapper = ({
  open,
  onClose,
  fullWidth,
  leftPanel,
  rightPanel,
  children,
  hideClose,
  useHalloween = false,
  light = false,
}: Props): JSX.Element => {
  const { back } = useAavegotchiSound();
  const [{ gameConfig }] = useGame();
  const isHalloween = useHalloween && gameConfig.gotchiverseTheme === 'halloween';

  const handleClose = useCallback(() => {
    back();
    onClose();
  }, [back, onClose]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    handleClose();
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Escape') handleClose();
  }, []);

  const blockPropagation = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.stopPropagation();
  };

  useEffect(() => {
    if (open) {
      document.addEventListener('keyup', handleKeyUp);
    } else {
      document.removeEventListener('keyup', handleKeyUp);
    }
    return () => {
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [open]);

  if (!open) return <></>;
  return (
    <Portal>
      <div
        className={`overlay ${light ? 'light' : ''}`}
        onClick={(e) => {
          if (!hideClose) handleClick(e);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isHalloween && <Image alt="" src={SpiderWebDark} layout="fill" />}
        <div
          className="panel-wrapper"
          style={{ width: fullWidth ? '100%' : 'inherit', opacity: isHalloween ? 0.85 : 1.0 }}
          onClick={blockPropagation}
          onMouseDown={blockPropagation}
        >
          {leftPanel && <div className="left-panel">{leftPanel}</div>}
          <div className="w-full h-full center-panel">{children}</div>
          {rightPanel && <div className="left-panel">{rightPanel}</div>}
        </div>
      </div>
      <style jsx>{styles}</style>
    </Portal>
  );
};
