import styles from './styles';
import type { WearableStack } from 'helpers/cartridgeWearable.helper';
import { slotLabel } from 'helpers/cartridgeWearable.helper';
import { WearableThumbnail } from 'components/UI/widgets';

interface Props {
  stack: WearableStack;
}

export const WearableStackCard = ({ stack }: Props): JSX.Element => {
  return (
    <>
      <div className={`gotchi-panel wearable-stack rarity-${stack.rarity}`}>
        <div className="gotchi-img">
          <div className="gotchi-img-wrapper">
            <div className="wearable-art">
              <WearableThumbnail itemTypeId={stack.itemTypeId} name={stack.name} size={72} />
              {stack.count > 1 ? <span className="stack-badge">x{stack.count}</span> : null}
            </div>
          </div>
        </div>
        <p className="gotchi-name">
          {stack.name}
          {stack.count > 1 ? ` · x${stack.count}` : ''}
        </p>
        <p className="wearable-sub">
          {stack.rarity} · {slotLabel(stack.slotIndex)}
        </p>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
