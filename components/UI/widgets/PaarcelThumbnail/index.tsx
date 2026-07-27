import { useState } from 'react';
import Image from 'next/image';
import styles from './styles';
import { paarcelImageUrl } from 'helpers/cartridgePaarcel.helper';

interface Props {
  realmTokenId: string | number;
  name?: string;
  size?: number;
  className?: string;
}

export const PaarcelThumbnail = ({
  realmTokenId,
  name,
  size = 48,
  className = '',
}: Props): JSX.Element => {
  const [failed, setFailed] = useState(false);
  const tid = String(realmTokenId || '').trim();
  const src = /^\d+$/.test(tid) ? paarcelImageUrl(tid) : '';

  return (
    <div className={`paarcel-thumb ${failed || !src ? 'fallback' : ''} ${className}`} style={{ width: size, height: size }}>
      {failed || !src ? (
        <span className="glyph" aria-hidden>
          ▣
        </span>
      ) : (
        <Image
          alt={name || `Parcel #${tid}`}
          src={src}
          width={size}
          height={size}
          unoptimized
          onError={() => setFailed(true)}
        />
      )}
      <style jsx>{styles}</style>
    </div>
  );
};
