import { ReactPortal, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  target?: '#portal' | '#portal-tooltip';
  children: ReactNode;
}

export const Portal = ({ target = '#portal', children }: Props): ReactPortal | null => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    return () => setMounted(false);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;
  const el = document.querySelector(target) || document.body;
  return createPortal(children, el);
};
