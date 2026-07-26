import { useState } from 'react';
import Image from 'next/image';
import styles from './styles';
import { wearableThumbnailUrl } from 'helpers/cartridgeWearable.helper';

interface Props {
  itemTypeId: number;
  name?: string;
  size?: number;
  className?: string;
}

export const WearableThumbnail = ({
  itemTypeId,
  name,
  size = 48,
  className = '',
}: Props): JSX.Element => {
  const [failed, setFailed] = useState(false);
  const src = wearableThumbnailUrl(itemTypeId);

  return (
    <div
      className={`wearable-thumb ${failed ? 'fallback' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      {failed || !itemTypeId ? (
        <span className="glyph" aria-hidden>
          ◆
        </span>
      ) : (
        <Image
          alt={name || `Wearable #${itemTypeId}`}
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
