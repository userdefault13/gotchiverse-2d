import { useGame } from 'contexts/GameContext';
import { FoundryNet, FoundryStore, FOUNDRY_RECIPES, MATERIAL_GROUPS } from 'helpers/foundry';
import { FoundryState, MaterialKey } from 'helpers/foundry/types';
import { useEffect, useState } from 'react';
import styles from './styles';

export const FoundryPanel = (): JSX.Element | null => {
  const [{ gameConfig }] = useGame();
  const enabled =
    Boolean((gameConfig as { enableParcelFoundryPoC?: boolean })?.enableParcelFoundryPoC) ||
    process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC === 'true';

  const [state, setState] = useState<FoundryState | null>(null);
  const [placeMode, setPlaceMode] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!enabled) return;
    FoundryStore.setFoundryEnabled(true);
    setState(FoundryStore.getState());
    return FoundryStore.subscribe(setState);
  }, [enabled]);

  if (!enabled || !state?.enabled) return null;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  const statusColor =
    state.netherlink === 'green' ? '#50dce6' : state.netherlink === 'amber' ? '#f08c32' : '#dc4650';

  const formatInputs = (inputs: Partial<Record<MaterialKey, number>>) =>
    Object.entries(inputs)
      .map(([k, v]) => `${k}×${v}`)
      .join(', ');

  return (
    <>
      <style jsx>{styles}</style>
      <div className="foundry-panel">
        <div className="foundry-title">Parcel Foundry PoC</div>
        <div className="row">
          <span>Netherlink</span>
          <strong style={{ color: statusColor }}>{state.netherlink.toUpperCase()}</strong>
        </div>
        <div className="row">
          <span>Tithe</span>
          <strong>{state.titheAccrued}</strong>
        </div>
        <div className="row">
          <span>Pollution</span>
          <strong>{state.pollution}</strong>
        </div>
        <div className="row">
          <span>Cargo (power)</span>
          <strong>
            {state.cargo.fud}/{state.cargo.fomo}/{state.cargo.alpha}/{state.cargo.kek}
          </strong>
        </div>
        {MATERIAL_GROUPS.map((group) => (
          <div className="mat-group" key={group.label}>
            <div className="mat-label">{group.label}</div>
            <div className="mat-row">
              {group.keys.map((key) => (
                <span key={key} title={key}>
                  {key.replace(/([A-Z])/g, ' $1').trim().slice(0, 3)} {state.materials[key]}
                </span>
              ))}
            </div>
          </div>
        ))}
        <div className="row">
          <span>Link-breakers</span>
          <strong>{state.enemies.filter((e) => e.hp > 0).length}</strong>
        </div>
        <div className="hint">{state.walkLedgerHint}</div>
        <div className="actions">
          <button type="button" onClick={() => setRecipesOpen(!recipesOpen)}>
            {recipesOpen ? 'Hide Recipes' : 'Recipes'}
          </button>
          <button
            type="button"
            onClick={async () => {
              const { default: FoundryNodes } = await import('components/phaser/FoundryNodes');
              FoundryNodes.setPlaceMode(!placeMode);
              setPlaceMode(!placeMode);
            }}
          >
            {placeMode ? 'Cancel Place' : 'Place Antenna'}
          </button>
          <button
            type="button"
            onClick={() => {
              flash(FoundryNet.meshTransfer().message);
            }}
          >
            Mesh Transfer
          </button>
          <button
            type="button"
            onClick={() => {
              flash(FoundryNet.bounceFreight().message);
            }}
          >
            Bounce Freight
          </button>
          <button
            type="button"
            onClick={() => {
              flash(FoundryNet.factionPulse().message);
            }}
          >
            Link-breaker Raid
          </button>
          <button
            type="button"
            onClick={async () => {
              const { default: FoundryNodes } = await import('components/phaser/FoundryNodes');
              flash(FoundryNodes.tryInteractNearby());
            }}
          >
            Interact Nearby
          </button>
        </div>
        {recipesOpen ? (
          <div className="recipes">
            {FOUNDRY_RECIPES.map((recipe) => (
              <div className="recipe" key={recipe.id}>
                <div className="recipe-title">
                  {recipe.label} <span className="tier">[{recipe.tier}]</span>
                </div>
                <div className="recipe-desc">{recipe.description}</div>
                <div className="recipe-io">
                  In: {formatInputs(recipe.inputs)}
                  {Object.keys(recipe.power).length
                    ? ` · Power: ${Object.entries(recipe.power)
                        .map(([k, v]) => `${k.toUpperCase()}×${v}`)
                        .join(' ')}`
                    : ''}
                  {' → '}
                  {formatInputs(recipe.outputs)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    flash(FoundryNet.craftRecipe(recipe.id).message);
                  }}
                >
                  Craft
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {toast ? <div className="toast">{toast}</div> : null}
      </div>
    </>
  );
};
