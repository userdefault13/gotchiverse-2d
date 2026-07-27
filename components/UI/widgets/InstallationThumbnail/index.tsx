import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import styles from './styles';
import { installationImageCandidates } from 'helpers/cartridgePaarcel.helper';

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
  const candidates = useMemo(
    () => installationImageCandidates(itemTypeId, kind),
    [itemTypeId, kind],
  );
  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [itemTypeId, kind]);

  const src = candidates[candidateIdx] || '';
  const failed = !src || candidateIdx >= candidates.length;

  return (
    <div
      className={`install-thumb ${failed ? 'fallback' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      {failed ? (
        <span className="glyph" aria-hidden>
          ◇
        </span>
      ) : (
        <Image
          key={`${itemTypeId}-${candidateIdx}-${src}`}
          alt={name || `Installation #${itemTypeId}`}
          src={src}
          width={size}
          height={size}
          unoptimized
          onError={() => setCandidateIdx((i) => i + 1)}
        />
      )}
      <style jsx>{styles}</style>
    </div>
  );
};
