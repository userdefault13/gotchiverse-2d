import Image from 'next/image';
import { FoundryRecipe, MATERIAL_ICONS } from 'helpers/foundry/recipes';
import { MaterialKey } from 'helpers/foundry/types';
import styles from './styles';

interface Props {
  recipe: FoundryRecipe;
  onCraft: (recipe: FoundryRecipe) => void;
}

function rows(items: Partial<Record<MaterialKey, number>>) {
  return Object.entries(items).filter(([, qty]) => (qty || 0) > 0) as Array<[MaterialKey, number]>;
}

export const FoundryRecipeCard = ({ recipe, onCraft }: Props): JSX.Element => {
  const inputs = rows(recipe.inputs);
  const outputs = rows(recipe.outputs);
  const power = Object.entries(recipe.power).filter(([, qty]) => (qty || 0) > 0);

  return (
    <>
      <div className="recipe" onClick={() => onCraft(recipe)} role="button" tabIndex={0}>
        <div className="card-container">
          <div className="img-container">
            <Image alt={recipe.label} src={recipe.imageUrl} width={96} height={96} />
          </div>
          <div className="name-container">
            <p>
              {recipe.label}
              <span className="tier"> {recipe.tier}</span>
            </p>
          </div>
        </div>
        <div className="ingredients-container">
          {inputs.length ? (
            <>
              <p className="section-label">Materials</p>
              {inputs.map(([key, qty]) => (
                <div key={`in-${key}`} className="ingredient">
                  <Image alt={key} src={MATERIAL_ICONS[key] || MATERIAL_ICONS.wire!} width={32} height={32} />
                  <p>
                    {qty} {key}
                  </p>
                </div>
              ))}
            </>
          ) : null}
          {power.length ? (
            <>
              <p className="section-label">Power</p>
              {power.map(([token, qty]) => (
                <div key={`pw-${token}`} className="ingredient">
                  <p>
                    {qty} {token.toUpperCase()}
                  </p>
                </div>
              ))}
            </>
          ) : null}
          {outputs.length ? (
            <>
              <p className="section-label">Output</p>
              {outputs.map(([key, qty]) => (
                <div key={`out-${key}`} className="ingredient">
                  <Image alt={key} src={MATERIAL_ICONS[key] || MATERIAL_ICONS.antennaRelay!} width={32} height={32} />
                  <p>
                    {qty} {key}
                  </p>
                </div>
              ))}
            </>
          ) : null}
          <p className="craft-hint">Click to craft</p>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
