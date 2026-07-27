import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import styles from './styles';
import { paarcelImageUrl, paarcelSizeCssVars } from 'helpers/cartridgePaarcel.helper';

interface Props {
  realmTokenId: string | number;
  name?: string;
  size?: number;
  className?: string;
  parcelSize?: string;
}

export const PaarcelThumbnail = ({
  realmTokenId,
  name,
  size = 48,
  className = '',
  parcelSize,
}: Props): JSX.Element => {
  const [failed, setFailed] = useState(false);
  const tid = String(realmTokenId || '').trim();
  const src = /^\d+$/.test(tid) ? paarcelImageUrl(tid) : '';
  const toneStyle = parcelSize ? (paarcelSizeCssVars(parcelSize) as CSSProperties) : undefined;

  return (
    <div
      className={`paarcel-thumb ${parcelSize ? 'size-tinted' : ''} ${failed || !src ? 'fallback' : ''} ${className}`}
      style={{ width: size, height: size, ...(toneStyle || {}) }}
    >
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
