import { useMemo, useState } from 'react';
import Image from 'next/image';
import styles from './styles';
import { installationImageSrc } from 'helpers/cartridgePaarcel.helper';

interface Props {
  itemTypeId: number;
  kind?: 'installation' | 'tile';
  name?: string;
  size?: number;
  className?: string;
}

export const InstallationThumbnail = ({
  itemTypeId,
  kind = 'installation',
  name,
  size = 48,
  className = '',
}: Props): JSX.Element => {
  const [failed, setFailed] = useState(false);
  const src = useMemo(() => installationImageSrc(itemTypeId, kind), [itemTypeId, kind]);

  return (
    <div
      className={`install-thumb ${failed || !src ? 'fallback' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      {failed || !src ? (
        <span className="glyph" aria-hidden>
          ◇
        </span>
      ) : (
        <Image
          alt={name || `Installation #${itemTypeId}`}
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
