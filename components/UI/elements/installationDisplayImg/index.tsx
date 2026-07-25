import styles from './styles';
import { getInstallationDisplays, getSimpleSpriteGif, getTileDisplays } from 'assets/images/installations';
import Image from 'next/image';
import Spritesheet from 'react-responsive-spritesheet';
import { useEffect, useState } from 'react';
import { InstallationTypeLocal, SpriteMetadata } from 'types';
import installationTypes from 'shared_code/data/installations.json';
import { GOTCHI_SIZE } from 'shared_code/constants/const.game';
import { getSpriteMetadataByItemId, isSimpleDecoration } from 'helpers/installations.helper';

interface Props {
  type: 'INSTALLATION' | 'TILE';
  itemId: number;
  installationScale?: number;
  withBG?: boolean;
}

export const InstallationDisplayImg = ({ type, itemId, installationScale = 0.5, withBG = true }: Props): JSX.Element => {
  const [spriteMetadata, setSpriteMetadata] = useState<SpriteMetadata>();
  const [itemType, setItemType] = useState<InstallationTypeLocal>();

  useEffect(() => {
    if (itemId) {
      void fetchAndsetSpriteMetadata();
    }
  }, [itemId]);

  const getInstallationSprite = () => {
    if (!spriteMetadata?.jsonData) {
      console.error('@getInstallationSprite: error fetching spriteMetadata');
      return;
    }
    if (!itemType) {
      console.error('@getInstallationSprite: error fetching itemType');
      return;
    }

    return (
      <span
        style={{
          position: 'relative',
          top: Number(spriteMetadata?.jsonData?.offset?.y || 2) / 2,
          // : Number(itemType.height * GOTCHI_SIZE.UNIT) / 2 + Number(spriteMetadata?.jsonData?.offset?.y || 2),
          height: spriteMetadata.isDecoration ? Number(itemType.height * GOTCHI_SIZE.UNIT) : Number(spriteMetadata.jsonData.tileheight),
          width: Number(spriteMetadata.jsonData.tilewidth),
        }}
      >
        <Spritesheet
          image={`animations/${spriteMetadata.isDecoration ? 'decorations' : 'installations'}/${spriteMetadata.key}.png`}
          widthFrame={spriteMetadata.jsonData.tilewidth}
          heightFrame={spriteMetadata.jsonData.tileheight}
          steps={1}
          fps={1}
          autoplay={true}
          startAt={spriteMetadata.frame + 1}
          endAt={spriteMetadata.frame + 1}
          loop={true}
        />
      </span>
    );
  };

  const fetchAndsetSpriteMetadata = async () => {
    const data = await getSpriteMetadataByItemId(itemId);
    setSpriteMetadata(data);
    const type = installationTypes[itemId];
    setItemType(type);
  };

  const getScalePerTileHeight = (): number => {
    const tileheight = Number(spriteMetadata?.jsonData?.tileheight || 64);
    const tilewidth = Number(spriteMetadata?.jsonData?.tilewidth || 64);
    // Missing offset used to NaN the sum → Infinity scale (Lodge cropped/zoomed).
    const offsetY = Number(spriteMetadata?.jsonData?.offset?.y ?? 0);
    const effectiveHeight = Math.max(1, tileheight + offsetY);
    let scale = 64 / effectiveHeight;

    // Large multi-tile art (Gotchi Lodge 320×384) — fit the card instead of shrinking to 1 tile.
    if (spriteMetadata?.key === 'lodge' || Number(itemType?.installationType) === 4) {
      scale = 150 / Math.max(tilewidth, effectiveHeight);
    }

    return scale;
  };

  return (
    <>
      <div className={`display-img ${type === 'TILE' ? 'tile' : ''}`}>
        {withBG && (
          <span className="bg-img">
            <Image alt="" src={type === 'INSTALLATION' ? getInstallationDisplays(itemId).bg : getTileDisplays(itemId).bg} layout="fill" />
          </span>
        )}
        {type === 'INSTALLATION' && spriteMetadata && !isSimpleDecoration(itemId) && (
          <span
            style={{
              transform: `translate(-50%, -50%) scale(${getScalePerTileHeight() || 0.8})`,
            }}
            className={!spriteMetadata?.isDecoration ? 'sprite-img installation' : 'sprite-img'}
          >
            {getInstallationSprite()}
          </span>
        )}
        {type === 'INSTALLATION' && spriteMetadata && isSimpleDecoration(itemId) && (
          <span className="item-img">{<Image alt="" src={getSimpleSpriteGif(spriteMetadata.pngName, 'decorations').img} />}</span>
        )}
        {type === 'TILE' && <span className="item-img">{<Image alt="" src={getTileDisplays(itemId).img} />}</span>}
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
