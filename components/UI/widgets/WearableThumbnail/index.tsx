import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import styles from './styles';
import { wearableRarityCssVars, wearableThumbnailUrl } from 'helpers/cartridgeWearable.helper';

interface Props {
  itemTypeId: number;
  name?: string;
  size?: number;
  className?: string;
  rarity?: string;
}

export const WearableThumbnail = ({
  itemTypeId,
  name,
  size = 48,
  className = '',
  rarity,
}: Props): JSX.Element => {
  const [failed, setFailed] = useState(false);
  const src = wearableThumbnailUrl(itemTypeId);
  const rarityStyle = rarity ? (wearableRarityCssVars(rarity) as CSSProperties) : undefined;

  return (
    <div
      className={`wearable-thumb ${rarity ? 'rarity-tinted' : ''} ${failed ? 'fallback' : ''} ${className}`}
      style={{ width: size, height: size, ...(rarityStyle || {}) }}
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
