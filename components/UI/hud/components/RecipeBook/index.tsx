import { useState, useEffect } from 'react';
import { ethers, providers } from 'ethers';
import _ from 'lodash';
import { useWeb3 } from 'contexts/Web3Context';
import { getInstallationTypes, getTileTypes } from 'web3/subgraph/queries';
import { useSubgraph } from 'web3/subgraph';
import { getContract } from 'web3/contract';
import { getContractFromRecipeType, getThemeColor } from 'helpers/functions';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { Loader, FilterSelect, SearchInput, SortSelect } from 'components/UI/elements';
import { Recipe, SortOption, TileType, NetworkNames, InstallationType } from 'types';
import { RecipeBookToggle } from './RecipeBookToggle';
import { RecipeBookModal, RecipeBookPage } from './RecipeBookModal';
import styles from './styles';
import { FoundryRecipeCard, RecipeCard } from 'components/UI/component';
import { gotchiverseSubgraph } from 'shared_code/web3/shared.const.web3';
import { useGame } from 'contexts/GameContext';
import { FOUNDRY_RECIPES, FoundryRecipe } from 'helpers/foundry/recipes';
import { FoundryNet } from 'helpers/foundry';
import { isWaallItemId } from 'helpers/waalls.helper';
import { getLocalLodgePageRecipes, isLodgeItemId } from 'helpers/lodge.helper';
import { getLocalStorePageRecipes, isStoreItemId } from 'helpers/store.installation.helper';
import { CONSOLE_AARCADE_GAMES, getLocalConsoleRecipes, isConsoleItemId } from 'helpers/console.installation.helper';
import {
  craftConsoleFurniture,
  craftStoreFurniture,
  getConsoleBagCount,
  getFurnitureQty,
  isStoreFurnitureItemId,
  isTerminalItemId,
} from 'helpers/store.layout.helper';
import { isBroadcasterItemId } from 'helpers/broadcaster.installation.helper';
import { getLocalTilePageRecipes } from 'helpers/ctile.helper';
import { getLocalOnchainRecipes, getLocalDecorationRecipes, isOriginalMintableRecipe } from 'helpers/recipeBook.local.helper';

interface Props {
  selectRecipe: (recipe: Recipe) => void;
  disabled: boolean;
}

const sortOptions: SortOption[] = [
  {
    name: 'ID',
    value: 'id',
    direction: 'desc',
  },
  {
    name: 'Name',
    value: 'name',
    direction: 'asc',
  },
  {
    name: 'Cost',
    value: 'cost',
    direction: 'desc',
  },
];

/** Original page-one filters — classic on-chain mintable types (no soft-launch Waall/Lodge). */
const typeFilters = [
  {
    name: 'Tiles',
    value: 'tile',
  },
  {
    name: 'Decorations',
    value: 'decoration',
  },
  {
    name: 'Harvesters',
    value: 'harvester',
  },
  {
    name: 'Reservoirs',
    value: 'reservoir',
  },
  {
    name: 'Aaltars',
    value: 'aaltar',
  },
  {
    name: 'Maakers',
    value: 'maaker',
  },
];

const DEFAULT_TYPE_FILTER = {
  tile: true,
  aaltar: true,
  reservoir: true,
  harvester: true,
  decoration: true,
  maaker: true,
  waall: false,
  lodge: false,
};

/** Networks that load recipes from the Gotchiverse subgraph (filters/search/sort). */
const SUBGRAPH_RECIPE_NETWORKS: NetworkNames[] = ['matic', 'base', 'robinhood'];

const isNotDeprecatedYet = (deprecatedAt?: string | number): boolean => {
  if (deprecatedAt == null || deprecatedAt === '' || Number(deprecatedAt) === 0) return true;
  const now = Date.now() / 1000;
  return Number(deprecatedAt) >= now;
};

/** Union recipes by id — later entries win (subgraph can override local catalog). */
const unionRecipesById = (...lists: Recipe[][]): Recipe[] => {
  const byId = new Map<string, Recipe>();
  lists.flat().forEach((r) => byId.set(`${r.type}-${r.id}`, r));
  return Array.from(byId.values());
};

const mergeLocalExtras = (recipes: Recipe[], nameFilter: string | undefined, typeFilter): Recipe[] => {
  // Page one = original on-chain mintables only (Waall/Lodge live on soft-launch pages).
  const localOnchain = getLocalOnchainRecipes(nameFilter, typeFilter);
  const withoutSoftLaunch = recipes.filter(
    (r) =>
      !isWaallItemId(r.id) &&
      !isLodgeItemId(r.id) &&
      !isStoreItemId(r.id) &&
      !isConsoleItemId(r.id) &&
      isOriginalMintableRecipe(r),
  );
  return unionRecipesById(localOnchain, withoutSoftLaunch);
};

const sortRecipes = (merged: Recipe[], sortBy: SortOption): Recipe[] => {
  let sorted: Recipe[];
  if (sortBy.value === 'id') sorted = _.sortBy(merged, (recipe: Recipe) => Number(recipe.id));
  else if (sortBy.value === 'name') sorted = _.sortBy(merged, (recipe: Recipe) => recipe.name);
  else if (sortBy.value === 'cost') sorted = _.sortBy(merged, (recipe: Recipe) => recipe.ingredients.fud);
  else sorted = merged;
  if (sortBy.direction === 'desc') sorted = _.reverse(sorted);
  return sorted;
};

export const RecipeBook = ({ selectRecipe, disabled }: Props): JSX.Element => {
  const [{ gameConfig }] = useGame();
  const [{ currentNetwork, globalProvider }] = useWeb3();
  const { click } = useAavegotchiSound();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSelect = (recipe: Recipe) => {
    click();
    selectRecipe(recipe);
    setOpen(false);
  };
  const [nameFilter, setNameFilter] = useState<string>(undefined);
  const [sort, setSort] = useState<SortOption>({ name: 'ID', value: 'id', direction: 'asc' });
  const [typeFilter, setTypeFilter] = useState({ ...DEFAULT_TYPE_FILTER });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [bookPage, setBookPage] = useState(0);
  const [craftToast, setCraftToast] = useState('');

  const foundryEnabled =
    Boolean((gameConfig as { enableParcelFoundryPoC?: boolean })?.enableParcelFoundryPoC) ||
    process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC === 'true';

  const bookPages: RecipeBookPage[] = [
    { id: 'onchain', label: 'RECIPES BOOK', shortLabel: 'On-chain installations' },
    { id: 'parcel-decor', label: 'DECOR RECIPES', shortLabel: 'Parcel decorations' },
    ...(foundryEnabled
      ? [{ id: 'foundry', label: 'LOGISTICS RECIPES', shortLabel: 'Off-chain foundry salvage' } as RecipeBookPage]
      : []),
    { id: 'store', label: 'STORE RECIPES', shortLabel: 'Soft-launch store & furniture' },
    { id: 'lodge', label: 'LODGE RECIPES', shortLabel: 'Soft-launch lodge & broadcaster' },
    { id: 'console', label: 'CONSOLE RECIPES', shortLabel: 'Craft into bag · place inside Store' },
    { id: 'ctiles', label: 'CTILE RECIPES', shortLabel: 'cTiles + golden tiles' },
  ];

  const storeRecipes = getLocalStorePageRecipes();
  const lodgePageRecipes = getLocalLodgePageRecipes();
  const consoleRecipes = getLocalConsoleRecipes();
  const ctileRecipes = getLocalTilePageRecipes();
  const decorRecipes = getLocalDecorationRecipes();
  const [pendingConsoleRecipe, setPendingConsoleRecipe] = useState<Recipe | null>(null);
  const onSetSortBy = (name: string, value: string, direction: 'asc' | 'desc') => {
    setSort({
      name,
      value,
      direction,
    });
  };

  const applyLocalOnchainFallback = (nameFilter: string, typeFilter, sortBy: SortOption) => {
    // Never allow an empty page-one — fall back to full local catalog if filters wiped.
    const safeFilter = {
      ...DEFAULT_TYPE_FILTER,
      ...(typeFilter || {}),
    };
    const local = getLocalOnchainRecipes(nameFilter, safeFilter);
    const merged = sortRecipes(mergeLocalExtras(local, nameFilter, safeFilter), sortBy);
    setRecipes(merged.length ? merged : sortRecipes(mergeLocalExtras([], nameFilter, DEFAULT_TYPE_FILTER), sortBy));
  };

  const fetchAndSetRecipesSubgraph = async (nameFilter: string, typeFilter, sortBy: SortOption) => {
    setPending(true);
    try {
      const safeFilter = { ...DEFAULT_TYPE_FILTER, ...(typeFilter || {}) };
      const installations = await useSubgraph<{ installationTypes: InstallationType[] }>(
        getInstallationTypes(nameFilter, safeFilter),
        gotchiverseSubgraph,
      );

      const installationTypes: InstallationType[] = (installations?.installationTypes || []).filter(
        (installation: InstallationType) =>
          Boolean(installation?.name) && isNotDeprecatedYet(installation.deprecatedAt),
      );

      const tiles = safeFilter.tile
        ? await useSubgraph<{ tileTypes: TileType[] }>(getTileTypes(nameFilter), gotchiverseSubgraph)
        : { tileTypes: [] };
      const tileTypes: TileType[] = (tiles?.tileTypes || []).filter(
        (tile: TileType) => Boolean(tile?.name) && isNotDeprecatedYet((tile as any).deprecatedAt),
      );

      // Base gotchiverse indexer often stubs InstallationType rows with null metadata.
      if (installationTypes.length === 0 && tileTypes.length === 0) {
        console.warn('RecipeBook: subgraph returned no craftable types — using local catalog');
        applyLocalOnchainFallback(nameFilter, safeFilter, sortBy);
        return;
      }

      const recipes = _.concat<InstallationType | TileType>(installationTypes, tileTypes).map((item: InstallationType | TileType): Recipe => {
        const isInstallation = 'installationType' in item;
        const costs = item.alchemicaCost || ['0', '0', '0', '0'];
        const data: Recipe = {
          id: item.id,
          name: item.name,
          ingredients: {
            fud: Number(ethers.utils.formatEther(costs[0] || '0')),
            fomo: Number(ethers.utils.formatEther(costs[1] || '0')),
            alpha: Number(ethers.utils.formatEther(costs[2] || '0')),
            kek: Number(ethers.utils.formatEther(costs[3] || '0')),
          },
          craftingTime: Number(item.craftTime),
          itemType: isInstallation ? item.installationType : item.tileType,
          type: isInstallation ? 'INSTALLATION' : 'TILE',
          installationType: isInstallation ? Number(item.installationType) : undefined,
          deprecated: false,
          endDate: undefined,
        };
        return data;
      });

      const merged = sortRecipes(mergeLocalExtras(recipes, nameFilter, safeFilter), sortBy);
      if (merged.length === 0) {
        applyLocalOnchainFallback(nameFilter, safeFilter, sortBy);
        return;
      }
      setRecipes(merged);
    } catch (err) {
      console.warn('RecipeBook: failed to load recipes from subgraph — using local catalog', err);
      applyLocalOnchainFallback(nameFilter, typeFilter, sortBy);
    } finally {
      setPending(false);
    }
  };

  const fetchContractRecipe = async (network: NetworkNames, provider: providers.Provider, type: 'INSTALLATION' | 'TILE'): Promise<Recipe[]> => {
    const contractType = getContractFromRecipeType(type);
    const contractCall = type === 'INSTALLATION' ? 'getInstallationTypes' : 'getTileTypes';
    const contract = await getContract(network, provider, contractType, false);
    let fetchedRecipes: Recipe[] = [];
    if (contract) {
      const response = await contract[contractCall]([]);
      fetchedRecipes = response
        .map((recipe, i) => {
          const data = {
            id: i,
            name: recipe.name,
            ingredients: {
              fud: Number(ethers.utils.formatEther(recipe.alchemicaCost[0])),
              fomo: Number(ethers.utils.formatEther(recipe.alchemicaCost[1])),
              alpha: Number(ethers.utils.formatEther(recipe.alchemicaCost[2])),
              kek: Number(ethers.utils.formatEther(recipe.alchemicaCost[3])),
            },
            craftingTime: Number(recipe.craftTime),
            itemType: type === 'INSTALLATION' ? recipe.installationType : recipe.tileType,
            type,
            installationType: recipe.installationType,
            deprecated: recipe.deprecated,
            // TODO: refactor endDate logic to work with contract endDate
            endDate: Number(recipe.endDate),
          };
          // assing leve for installationTypes
          if (recipe.level) _.assign(data, { level: recipe.level });
          return data;
        })
        .filter((recipe) => !recipe.deprecated && (recipe.level ? recipe.level === 1 : true && recipe.id !== 0));
      // .filter((recipe) => recipe.id !== 2);
    }
    return fetchedRecipes;
  };

  const fetchAndSetRecipesMumbai = async (currentNetwork, globalProvider) => {
    setPending(true);
    const fetchedInstallations = await fetchContractRecipe(currentNetwork, globalProvider, 'INSTALLATION');
    const fetchedTiles = await fetchContractRecipe(currentNetwork, globalProvider, 'TILE');
    const fetchedItems = _.concat(fetchedInstallations, fetchedTiles);
    setRecipes(sortRecipes(mergeLocalExtras(fetchedItems, undefined, DEFAULT_TYPE_FILTER), sort));
    setPending(false);
  };

  useEffect(() => {
    if (currentNetwork === 'mumbai' && globalProvider) {
      void fetchAndSetRecipesMumbai(currentNetwork, globalProvider);
    }
  }, [currentNetwork, globalProvider]);

  useEffect(() => {
    if (!open || sort === undefined) return;
    if (SUBGRAPH_RECIPE_NETWORKS.includes(currentNetwork)) {
      void fetchAndSetRecipesSubgraph(nameFilter, typeFilter, sort);
    } else if (currentNetwork !== 'mumbai') {
      // Offline / unknown network — still show the original local catalog.
      applyLocalOnchainFallback(nameFilter, typeFilter, sort);
    }
  }, [currentNetwork, nameFilter, typeFilter, sort, open]);

  useEffect(() => {
    if (!open) {
      setBookPage(0);
      setCraftToast('');
    }
  }, [open]);

  const handleCraftFoundryRecipe = (recipe: FoundryRecipe) => {
    click();
    const result = FoundryNet.craftRecipe(recipe.id);
    setCraftToast(result.message);
    window.setTimeout(() => setCraftToast(''), 2500);
  };

  const handleSelectStoreRecipe = (recipe: Recipe) => {
    click();
    // Terminal → Crafting Table so the terminal sprite fills the craft output slot.
    if (isTerminalItemId(recipe.id)) {
      selectRecipe(recipe);
      setOpen(false);
      return;
    }
    // Shelf / Cashier craft into the store-furniture bag (place inside Store modal).
    if (isStoreFurnitureItemId(recipe.id)) {
      const result = craftStoreFurniture(Number(recipe.id), 1);
      const qty = getFurnitureQty(Number(recipe.id));
      setCraftToast(result.ok ? `${result.message} (bag: ${qty})` : result.message);
      window.setTimeout(() => setCraftToast(''), 2500);
      return;
    }
    // Store building → CraftingTable / local off-chain craft.
    selectRecipe(recipe);
    setOpen(false);
  };

  const handleSelectLodgeRecipe = (recipe: Recipe) => {
    click();
    // Broadcaster → Crafting Table (sprite in output slot), then lodge furniture bag on Craft.
    if (isBroadcasterItemId(recipe.id)) {
      selectRecipe(recipe);
      setOpen(false);
      return;
    }
    // Exterior Lodge → CraftingTable / local off-chain craft.
    selectRecipe(recipe);
    setOpen(false);
  };

  const handleSelectConsoleRecipe = (recipe: Recipe) => {
    click();
    // Console L1 → pick first Aarcade title, then craft into instance bag.
    if (isConsoleItemId(recipe.id)) {
      setPendingConsoleRecipe(recipe);
      return;
    }
    selectRecipe(recipe);
    setOpen(false);
  };

  const finishConsoleCraft = (gameId: string) => {
    if (!pendingConsoleRecipe) return;
    click();
    const result = craftConsoleFurniture(Number(pendingConsoleRecipe.id), gameId, 1);
    const qty = getConsoleBagCount(Number(pendingConsoleRecipe.id));
    setCraftToast(result.ok ? `${result.message} (bag: ${qty})` : result.message);
    setPendingConsoleRecipe(null);
    window.setTimeout(() => setCraftToast(''), 2500);
  };

  const showOnChainPage = bookPages[bookPage]?.id === 'onchain';
  const showParcelDecorPage = bookPages[bookPage]?.id === 'parcel-decor';
  const showFoundryPage = bookPages[bookPage]?.id === 'foundry';
  const showStorePage = bookPages[bookPage]?.id === 'store';
  const showLodgePage = bookPages[bookPage]?.id === 'lodge';
  const showConsolePage = bookPages[bookPage]?.id === 'console';
  const showCTilesPage = bookPages[bookPage]?.id === 'ctiles';

  return (
    <>
      <RecipeBookToggle onClick={() => setOpen(true)} disabled={disabled} />
      <RecipeBookModal
        open={open}
        onClose={() => setOpen(false)}
        pages={bookPages}
        activePage={bookPage}
        onPageChange={setBookPage}
      >
        {showOnChainPage && pending && (
          <>
            <div className="loading-box"></div>
            <div className="loading-content">
              <Loader size={0.2} />
              <p>Loading</p>
            </div>
          </>
        )}
        {showOnChainPage && (
          <div className="filter-container">
            <div className="search-input">
              <SearchInput value={nameFilter || ''} onChange={setNameFilter} color={getThemeColor()} placeholder="Search by name, type, etc..." />
            </div>
            <div className="filter-options">
              <FilterSelect
                filters={typeFilters}
                width="17rem"
                onChange={(state) => {
                  // Merge filter toggles onto defaults so an empty first fire can't wipe the catalog.
                  setTypeFilter({ ...DEFAULT_TYPE_FILTER, ...state });
                }}
              />
              <SortSelect options={sortOptions} selected={sort} placeholder="Sort by" width="14rem" onSelect={onSetSortBy} useTheme={true} />
            </div>
          </div>
        )}
        {showFoundryPage ? (
          <div className="foundry-intro">
            Off-chain logistics: mine ores/gases → smelt (costs alchemica power) → parts → assemble Antenna Relay → place on map.
          </div>
        ) : null}
        {showParcelDecorPage ? (
          <div className="foundry-intro">
            All parcel decorations: Rofl Gnomes, REALM Globes, Smol Flowers, Halloween set, Graand Fountain, and more.
          </div>
        ) : null}
        {showStorePage ? (
          <div className="foundry-intro">
            Soft-launch retail: craft a Store for your parcel, Shelf & Cashier into your furniture bag, and Terminal via the Crafting
            Table — then place them inside the Store.
          </div>
        ) : null}
        {showLodgePage ? (
          <div className="foundry-intro">
            Soft-launch lodge: craft a Lodge for your parcel, and a Broadcaster via the Crafting Table into your lodge furniture
            bag — then place the Broadcaster inside the Lodge.
          </div>
        ) : null}
        {showConsolePage ? (
          <div className="foundry-intro">
            Soft-launch arcade: craft a Console into your furniture bag (pick a title to unlock), then place it inside a Store. Level =
            title slots; L9 plays any owned cartridge.
          </div>
        ) : null}
        {showCTilesPage ? (
          <div className="foundry-intro">
            Soft-launch cTiles (greyscale bases + Ghost pack) craft into your cartridge bag. LE Golden Tiles craft on-chain via
            the Crafting Table.
          </div>
        ) : null}
        {pendingConsoleRecipe ? (
          <div className="foundry-intro console-title-pick">
            <p>
              Load first title onto <strong>{pendingConsoleRecipe.name}</strong>:
            </p>
            <div className="console-title-grid">
              {CONSOLE_AARCADE_GAMES.map((game) => (
                <button key={game.id} type="button" className="console-title-btn" onClick={() => finishConsoleCraft(game.id)}>
                  {game.name}
                </button>
              ))}
            </div>
            <button type="button" className="console-title-cancel" onClick={() => setPendingConsoleRecipe(null)}>
              Cancel
            </button>
          </div>
        ) : null}
        {craftToast ? <div className="craft-toast">{craftToast}</div> : null}
        <div className={`scrollable ${gameConfig.gotchiverseTheme}`}>
          <div className="content">
            {showOnChainPage && !pending && recipes?.length === 0 ? (
              <div className="empty-recipes">No recipes found</div>
            ) : null}
            {showOnChainPage
              ? recipes?.map((recipe, i) => <RecipeCard onClick={handleSelect} recipe={recipe} key={`${recipe.type}-${recipe.id}-${i}`} />)
              : null}
            {showParcelDecorPage
              ? decorRecipes.map((recipe, i) => (
                  <RecipeCard onClick={handleSelect} recipe={recipe} key={`decor-${recipe.id}-${i}`} />
                ))
              : null}
            {showFoundryPage
              ? FOUNDRY_RECIPES.map((recipe) => (
                  <FoundryRecipeCard recipe={recipe} key={recipe.id} onCraft={handleCraftFoundryRecipe} />
                ))
              : null}
            {showStorePage
              ? storeRecipes.map((recipe, i) => (
                  <RecipeCard onClick={handleSelectStoreRecipe} recipe={recipe} key={`store-${recipe.id}-${i}`} />
                ))
              : null}
            {showLodgePage
              ? lodgePageRecipes.map((recipe, i) => (
                  <RecipeCard onClick={handleSelectLodgeRecipe} recipe={recipe} key={`lodge-${recipe.id}-${i}`} />
                ))
              : null}
            {showConsolePage
              ? consoleRecipes.map((recipe, i) => (
                  <RecipeCard onClick={handleSelectConsoleRecipe} recipe={recipe} key={`console-${recipe.id}-${i}`} />
                ))
              : null}
            {showCTilesPage
              ? ctileRecipes.map((recipe, i) => (
                  <RecipeCard onClick={handleSelect} recipe={recipe} key={`ctile-${recipe.id}-${i}`} />
                ))
              : null}
          </div>
        </div>
      </RecipeBookModal>
      <style jsx>{styles}</style>
    </>
  );
};
