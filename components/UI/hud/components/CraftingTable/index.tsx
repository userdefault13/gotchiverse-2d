/* eslint-disable @typescript-eslint/indent */
/* eslint-disable multiline-ternary */
import styles from './styles';
import { UsersAlchemicaBalance, CraftingProgress, CraftingGlitter } from './components';
import { useEffect, useState } from 'react';
import { AnvilImage } from 'assets/images';
import _ from 'lodash';
import { getAlchemicaIcon, getContractFromRecipeType } from 'helpers/functions';
import { useNotification } from 'contexts/NotificationContext';
import { handleCompletedCraft, showTransactionNotification, updateTransactionNotificationStatus } from 'contexts/NotificationContext/actions';
import { checkTokensAllowance, fetchTokensAllowance, getContract, getMaxQuantity } from 'web3/contract';
import { useWeb3 } from 'contexts/Web3Context';
import { gasPriceDict } from 'web3/web3';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import type { providers, Signer } from 'ethers';
import { ApprovalNeeded } from 'components/UI/widgets/ApprovalNeeded';
import { RecipeBook } from '../RecipeBook';
import Image from 'next/image';
import { useUser } from 'contexts/UserContext';
import { fetchAndSetAlchemicaBalance } from 'contexts/UserContext/actions';
import { MaticNeeded } from 'components/UI/widgets';
import { useUI } from 'contexts/UIContexts';
import { postFocusStatus } from 'contexts/UIContexts/actions';
import { getErrMessage } from 'helpers/ethers.helper';
import { FullscreenModal } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { useGame } from 'contexts/GameContext';
import type { AlchemicaBalance, NetworkNames, Recipe } from 'types';
import { craftWaallLocally, isWaallItemId } from 'helpers/waalls.helper';
import { craftLodgeLocally, isLodgeItemId } from 'helpers/lodge.helper';
import { craftStoreLocally, isStoreItemId } from 'helpers/store.installation.helper';
import {
  craftConsoleFurniture,
  craftStoreFurniture,
  isStoreFurnitureItemId,
  isTerminalItemId,
} from 'helpers/store.layout.helper';
import { craftLodgeFurniture, isLodgeFurnitureItemId } from 'helpers/lodge.layout.helper';
import { isBroadcasterItemId } from 'helpers/broadcaster.installation.helper';
import {
  consumePendingConsoleCraftTitle,
  isConsoleItemId,
  peekPendingConsoleCraftTitle,
} from 'helpers/console.installation.helper';
import { craftCTileLocally, isCTileItemId } from 'helpers/ctile.helper';
import {
  craftSoftInstallsOnDiamond,
  isGv2dDiamondMintEnabled,
  isGv2dSoftInstallCraftId,
  isGv2dSoftTileMintId,
  mintSoftCTilesOnDiamond,
} from 'helpers/gv2dDiamond.helper';
import { mintCraftedItemsToCartridge } from 'helpers/auth.helper';
import GlobalState from 'contexts/GlobalState';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface AlchemicaApproved {
  fud: boolean;
  fomo: boolean;
  alpha: boolean;
  kek: boolean;
}

type ContractName = 'installationDiamond' | 'tileDiamond';

export const CraftingTable = ({ open, onClose }: Props): JSX.Element => {
  const [{ gameConfig }] = useGame();
  const { craft, craftSuccess, craftError, send } = useAavegotchiSound();

  const [, notificationDispatch] = useNotification();
  const [{ currentAccount, currentNetwork, globalProvider, ethersSigner }] = useWeb3();
  const [{ alchemicaBalance, cartridgeId }, userDispatch] = useUser();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>();
  const [pending, setPending] = useState(false);
  const [crafting, setCrafting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quanity, setQuantity] = useState(1);
  const [maxQuantity, setMaxQuantity] = useState(0);

  const [{ socket }, uiDispatch] = useUI();

  const [alchemicaApproved, setAlchemicaApproved] = useState<{ [key in ContractName]: AlchemicaApproved }>({
    tileDiamond: undefined,
    installationDiamond: undefined,
  });

  const initModal = async (config: { account: string; network: NetworkNames; provider: providers.Provider }) => {
    const { account, network, provider } = config;

    setLoading(true);
    await fetchAndSetAlchemicaBalances(account, network, provider);
    // await fetchAndSetHasEnoughtMatic(account, network, provider);
    setLoading(false);
  };

  const fetchAndSetAllowance = async (account: string, network: NetworkNames, provider: providers.Provider, recipe?: Recipe) => {
    setPending(true);
    const contract = getContractFromRecipeType(recipe.type);
    const response = await fetchTokensAllowance(contract, account, network, provider);
    if (response) {
      const allowedAlchemica = checkTokensAllowance(
        {
          fud: recipe?.ingredients.fud || 0.1,
          fomo: recipe?.ingredients.fomo || 0.1,
          alpha: recipe?.ingredients.alpha || 0.1,
          kek: recipe?.ingredients.kek || 0.1,
        },
        {
          fud: response[0],
          fomo: response[1],
          alpha: response[2],
          kek: response[3],
        },
      );
      setAlchemicaApproved((prevState) => {
        return {
          ...prevState,
          [contract]: {
            ...allowedAlchemica,
            gltr: true,
          },
        };
      });
    }
    setPending(false);
  };

  const fetchAndSetAlchemicaBalances = async (account: string, network: NetworkNames, provider: providers.Provider) => {
    setPending(true);
    try {
      await fetchAndSetAlchemicaBalance({ account, network, provider }, userDispatch);
    } catch (e) {
      // Base Sepolia (GV-2D soft mint) has no alchemica vars — keep modal usable.
      console.warn('CraftingTable: alchemica balance fetch skipped', e);
    }
    setPending(false);
  };

  const mintCraftToCartridge = async (recipe: Recipe, qty: number, account: string, network: NetworkNames) => {
    try {
      const result = await mintCraftedItemsToCartridge(account, {
        itemTypeId: Number(recipe.id),
        quantity: qty,
        kind: recipe.type === 'TILE' ? 'tile' : 'installation',
        name: recipe.name,
        cartridgeId: cartridgeId || undefined,
        network,
      });
      if (result.minted > 0) {
        const refreshed = await (await import('helpers/auth.helper')).getCartridgePaarcels(
          account,
          String(cartridgeId || ''),
        );
        if (refreshed.ok) {
          userDispatch({
            type: 'UPDATE_USER_CARTRIDGE',
            cartridgeId: refreshed.cartridgeId || cartridgeId,
            hasCartridge: true,
            parcelInventory: refreshed.parcelInventory,
            installationInventory: refreshed.installationInventory,
          });
        }
      }
      if (result.errors.length) {
        console.warn('CraftingTable: cartridge mint partial failure', result.errors);
      }
    } catch (e) {
      console.warn('CraftingTable: cartridge mint failed', e);
    }
  };

  const handleCraft = async (
    recipe: Recipe,
    config: {
      network: NetworkNames;
      signer: Signer;
      account: string;
      provider: providers.Provider;
    },
  ) => {
    setPending(true);

    const isConsole = isConsoleItemId(recipe.id);
    const isCTileSoft = recipe.type === 'TILE' && recipe.softLaunch && isCTileItemId(recipe.id);
    // Flag on → soft cTiles 8–47 mint via Base Sepolia GV-2D diamond (never craftCTileLocally).
    if (isCTileSoft && isGv2dDiamondMintEnabled()) {
      if (!isGv2dSoftTileMintId(recipe.id)) {
        setPending(false);
        craftError();
        return;
      }
      if (!config.account || !config.signer || !config.provider) {
        const notificationId = showTransactionNotification(notificationDispatch, {
          message: 'Connect wallet to mint soft cTiles',
        });
        updateTransactionNotificationStatus(
          notificationDispatch,
          notificationId,
          'error',
          'Connect your wallet (Base Sepolia) to craft soft cTiles on the GV-2D diamond.',
        );
        craftError();
        setPending(false);
        return;
      }
      let notificationId;
      try {
        notificationId = showTransactionNotification(notificationDispatch, {
          message: 'Minting cTile on GV-2D diamond (Base Sepolia)',
        });
        const result = await mintSoftCTilesOnDiamond({
          itemId: Number(recipe.id),
          quantity: quanity,
          account: config.account,
          signer: config.signer,
          provider: config.provider,
          name: recipe.name,
        });
        if (GlobalState.USER?.state?.inventory) {
          userDispatch({ type: 'UPDATE_INVENTORY', inventory: [...GlobalState.USER.state.inventory] });
        }
        craft();
        updateTransactionNotificationStatus(notificationDispatch, notificationId, 'success');
        setCrafting(true);
        setPending(false);
        setTimeout(() => {
          craftSuccess();
          handleCompletedCraft(notificationDispatch, _.fill(Array(quanity), recipe.id), recipe.name);
          setCrafting(false);
        }, 1200);
        console.info('[gv2d] soft cTile mint ok', result.txHash, 'balance=', result.balance);
      } catch (e) {
        notificationId &&
          updateTransactionNotificationStatus(notificationDispatch, notificationId, 'error', getErrMessage(e));
        craftError();
        setPending(false);
      }
      return;
    }

    // Flag on → soft installs 162–215 + Decor type-7 craft via Base Sepolia GV-2D diamond (never *Locally / L1 Installation).
    if (recipe.type === 'INSTALLATION' && isGv2dSoftInstallCraftId(recipe.id) && isGv2dDiamondMintEnabled()) {
      if (!config.account || !config.signer || !config.provider) {
        const notificationId = showTransactionNotification(notificationDispatch, {
          message: 'Connect wallet to craft soft installs',
        });
        updateTransactionNotificationStatus(
          notificationDispatch,
          notificationId,
          'error',
          'Connect your wallet (Base Sepolia) to craft soft installs on the GV-2D diamond.',
        );
        craftError();
        setPending(false);
        return;
      }
      let notificationId;
      try {
        notificationId = showTransactionNotification(notificationDispatch, {
          message: 'Crafting on GV-2D diamond (Base Sepolia)', // soft installs + Decor
        });
        const result = await craftSoftInstallsOnDiamond({
          itemId: Number(recipe.id),
          quantity: quanity,
          account: config.account,
          signer: config.signer,
          provider: config.provider,
          name: recipe.name,
        });
        if (GlobalState.USER?.state?.inventory) {
          userDispatch({ type: 'UPDATE_INVENTORY', inventory: [...GlobalState.USER.state.inventory] });
        }
        craft();
        updateTransactionNotificationStatus(notificationDispatch, notificationId, 'success');
        setCrafting(true);
        setPending(false);
        setTimeout(() => {
          craftSuccess();
          handleCompletedCraft(notificationDispatch, _.fill(Array(quanity), recipe.id), recipe.name);
          setCrafting(false);
        }, 1200);
        console.info('[gv2d] soft-install craft ok', result.txHash, 'balance=', result.balance);
      } catch (e) {
        notificationId &&
          updateTransactionNotificationStatus(notificationDispatch, notificationId, 'error', getErrMessage(e));
        craftError();
        setPending(false);
      }
      return;
    }

    const isSoftLocal =
      Boolean(recipe.softLaunch) ||
      isConsole ||
      (recipe.type === 'INSTALLATION' &&
        (isWaallItemId(recipe.id) ||
          isLodgeItemId(recipe.id) ||
          isStoreItemId(recipe.id) ||
          isStoreFurnitureItemId(recipe.id) ||
          isLodgeFurnitureItemId(recipe.id) ||
          isBroadcasterItemId(recipe.id))) ||
      (recipe.type === 'TILE' && recipe.softLaunch && isCTileItemId(recipe.id));

    // Soft-launch local crafts (Waall / Lodge / Store / Terminal / Broadcaster / Console / cTiles) — no diamond.
    // Soft cTiles / soft installs 162–215 only reach here when NEXT_PUBLIC_USE_GV2D_DIAMOND is off.
    if (isSoftLocal) {
      let notificationId;
      try {
        const isLodge = isLodgeItemId(recipe.id);
        const isStore = isStoreItemId(recipe.id);
        const isFurniture = isStoreFurnitureItemId(recipe.id) && !isConsole;
        const isLodgeFurniture =
          !isConsole && (isLodgeFurnitureItemId(recipe.id) || isBroadcasterItemId(recipe.id));
        const isCTile = recipe.type === 'TILE' && isCTileItemId(recipe.id);
        notificationId = showTransactionNotification(notificationDispatch, {
          message: isConsole
            ? 'Crafting Console (local)'
            : isCTile
              ? 'Crafting cTile (local)'
              : isLodgeFurniture
                ? isBroadcasterItemId(recipe.id)
                  ? 'Crafting Broadcaster (local)'
                  : 'Crafting lodge furniture (local)'
                : isFurniture
                  ? isTerminalItemId(recipe.id)
                    ? 'Crafting Terminal (local)'
                    : 'Crafting store furniture (local)'
                  : isStore
                    ? 'Crafting Store (local)'
                    : isLodge
                      ? 'Crafting Lodge (local)'
                      : 'Crafting Waall (local)',
        });
        const result = isConsole
          ? (() => {
              const title = peekPendingConsoleCraftTitle();
              if (!title) {
                return {
                  ok: false,
                  message: 'Pick an Aarcade title in CONSOLE recipes first',
                  nextBalance: undefined as AlchemicaBalance | undefined,
                };
              }
              const furniture = craftConsoleFurniture(Number(recipe.id), title, quanity);
              if (furniture.ok) consumePendingConsoleCraftTitle();
              return {
                ok: furniture.ok,
                message: furniture.message,
                nextBalance: undefined as AlchemicaBalance | undefined,
              };
            })()
          : isCTile
            ? craftCTileLocally(recipe, quanity, alchemicaBalance)
            : isLodgeFurniture
              ? (() => {
                  const furniture = craftLodgeFurniture(Number(recipe.id), quanity);
                  return { ok: furniture.ok, message: furniture.message, nextBalance: undefined as AlchemicaBalance | undefined };
                })()
              : isFurniture
                ? (() => {
                    const furniture = craftStoreFurniture(Number(recipe.id), quanity);
                    return { ok: furniture.ok, message: furniture.message, nextBalance: undefined as AlchemicaBalance | undefined };
                  })()
                : isStore
                  ? craftStoreLocally(recipe, quanity, alchemicaBalance)
                  : isLodge
                    ? craftLodgeLocally(recipe, quanity, alchemicaBalance)
                    : craftWaallLocally(recipe, quanity, alchemicaBalance);
        if (!result.ok) {
          updateTransactionNotificationStatus(notificationDispatch, notificationId, 'error', result.message);
          craftError();
          setPending(false);
          return;
        }
        if (result.nextBalance) {
          userDispatch({ type: 'UPDATE_ALCHEMICA_BALANCE', alchemicaBalance: result.nextBalance });
        }
        if (GlobalState.USER?.state?.inventory) {
          userDispatch({ type: 'UPDATE_INVENTORY', inventory: [...GlobalState.USER.state.inventory] });
        }
        if (!isFurniture && !isLodgeFurniture && !isConsole) {
          void mintCraftToCartridge(recipe, quanity, config.account, config.network);
        }
        craft();
        updateTransactionNotificationStatus(notificationDispatch, notificationId, 'success');
        setCrafting(true);
        setPending(false);
        setTimeout(() => {
          craftSuccess();
          handleCompletedCraft(notificationDispatch, _.fill(Array(quanity), recipe.id), recipe.name);
          setCrafting(false);
        }, 1200);
      } catch (e) {
        notificationId && updateTransactionNotificationStatus(notificationDispatch, notificationId, 'error', getErrMessage(e));
        craftError();
        setPending(false);
      }
      return;
    }

    const contractType = getContractFromRecipeType(recipe.type);
    const contract = await getContract(config.network, config.signer, contractType, true);

    let notificationId, tx;
    const craftItems = _.fill(Array(quanity), recipe.id);

    try {
      notificationId = showTransactionNotification(notificationDispatch, { message: 'Initiated crafting' });
      tx =
        recipe.type === 'INSTALLATION'
          ? await contract.craftInstallations(
              craftItems,
              craftItems.map(() => 0),
              { ...(await gasPriceDict(ethersSigner)) },
            )
          : await contract.craftTiles(craftItems, { ...(await gasPriceDict(ethersSigner)) });
      craft();
      const transaction = await tx.wait();
      if (transaction.status === 1) {
        updateTransactionNotificationStatus(notificationDispatch, notificationId, 'success');
        setCrafting(true);
        setPending(false);

        await fetchAndSetAlchemicaBalances(config.account, config.network, config.provider);
        void mintCraftToCartridge(recipe, quanity, config.account, config.network);

        setTimeout(() => {
          craftSuccess();
          if (recipe.craftingTime === 0) {
            handleCompletedCraft(notificationDispatch, craftItems, recipe.name);
          }
          setCrafting(false);
        }, 3300);
      }
    } catch (e) {
      notificationId && updateTransactionNotificationStatus(notificationDispatch, notificationId, 'error', getErrMessage(tx || e));
      craftError();
      setPending(false);
    }
  };

  const haveRequiredIngredients = (recipe: Recipe, alchemicaBalance: AlchemicaBalance) => {
    return !Object.keys(recipe.ingredients).find((alchemica) => recipe.ingredients[alchemica] > alchemicaBalance[alchemica]);
  };

  const isConnected = !!(currentAccount && currentNetwork && ethersSigner && globalProvider);

  const isApproved = (allowance?: { fud: boolean; fomo: boolean; alpha: boolean; kek: boolean }): 'true' | 'false' | 'undefined' => {
    if (allowance === undefined) return 'undefined';
    return Object.keys(allowance).some((alchemica) => !allowance[alchemica]) ? 'false' : 'true';
  };

  useEffect(() => {
    if (open && currentAccount && currentNetwork && globalProvider) {
      void initModal({
        account: currentAccount,
        network: currentNetwork,
        provider: globalProvider,
      });
    }
  }, [open, currentAccount, currentNetwork, globalProvider, ethersSigner]);

  useEffect(() => {
    if (
      currentAccount &&
      currentNetwork &&
      globalProvider &&
      selectedRecipe &&
      !selectedRecipe.softLaunch &&
      !isWaallItemId(selectedRecipe.id) &&
      !isLodgeItemId(selectedRecipe.id) &&
      !isStoreItemId(selectedRecipe.id) &&
      !isStoreFurnitureItemId(selectedRecipe.id) &&
      !isLodgeFurnitureItemId(selectedRecipe.id) &&
      !isBroadcasterItemId(selectedRecipe.id) &&
      !isConsoleItemId(selectedRecipe.id)
    ) {
      void fetchAndSetAllowance(currentAccount, currentNetwork, globalProvider, selectedRecipe);
    }
  }, [selectedRecipe, currentAccount, currentNetwork, globalProvider]);

  useEffect(() => {
    if (selectedRecipe && alchemicaBalance) {
      const diamondSoft =
        isGv2dDiamondMintEnabled() &&
        ((selectedRecipe.softLaunch &&
          selectedRecipe.type === 'TILE' &&
          isCTileItemId(selectedRecipe.id)) ||
          (selectedRecipe.type === 'INSTALLATION' && isGv2dSoftInstallCraftId(selectedRecipe.id)));
      // paymentEnabled=false on Sepolia — do not gate qty on local alchemica.
      const max = diamondSoft ? 50 : getMaxQuantity(selectedRecipe.ingredients, alchemicaBalance);
      setMaxQuantity(max);
    }
  }, [selectedRecipe, alchemicaBalance]);

  useEffect(() => {
    uiDispatch({
      type: 'UPDATE_INMENU',
      inMenu: open,
    });
    postFocusStatus(!open, uiDispatch); // If open, the focus on game is false, and vice versa
  }, [open]);

  if (
    selectedRecipe !== undefined &&
    !selectedRecipe.softLaunch &&
    !isWaallItemId(selectedRecipe.id) &&
    !isLodgeItemId(selectedRecipe.id) &&
    !isStoreItemId(selectedRecipe.id) &&
    !isStoreFurnitureItemId(selectedRecipe.id) &&
    !isLodgeFurnitureItemId(selectedRecipe.id) &&
    !isBroadcasterItemId(selectedRecipe.id) &&
    !isConsoleItemId(selectedRecipe.id) &&
    isApproved(alchemicaApproved[getContractFromRecipeType(selectedRecipe.type)]) === 'false'
  ) {
    return (
      <ApprovalNeeded
        approved={alchemicaApproved[getContractFromRecipeType(selectedRecipe.type)]}
        handleApproved={(alchemica) =>
          setAlchemicaApproved((prevState) => {
            return {
              ...prevState,
              [getContractFromRecipeType(selectedRecipe.type)]: alchemica,
            };
          })
        }
        open={open}
        onClose={onClose}
        contractName={getContractFromRecipeType(selectedRecipe.type)}
      />
    );
  }

  return (
    <FullscreenModal title="Crafting Table" isCrafting={true} open={open} onClose={onClose}>
      {!isConnected && !loading && (
        <div className="unconnected-state">
          <h2>Not connected</h2>
          <p>Please connect your wallet to website to continue.</p>
        </div>
      )}
      <MaticNeeded />

      {(isConnected || loading) && (
        <div className={`crafting-table-container ${gameConfig.gotchiverseTheme}`}>
          <div className="inner">
            {/* <div className="table-tab">
              <InProgressTab />
            </div> */}
            <UsersAlchemicaBalance usersAlchemicaBalance={alchemicaBalance} color={`${gameConfig.gotchiverseTheme}`} />
            <CraftingProgress
              crafting={crafting}
              selectedRecipe={selectedRecipe}
              requiredBalance={{
                fud: !!selectedRecipe && selectedRecipe.ingredients.fud <= alchemicaBalance.fud,
                fomo: !!selectedRecipe && selectedRecipe.ingredients.fomo <= alchemicaBalance.fomo,
                alpha: !!selectedRecipe && selectedRecipe.ingredients.alpha <= alchemicaBalance.alpha,
                kek: !!selectedRecipe && selectedRecipe.ingredients.kek <= alchemicaBalance.kek,
              }}
              quantity={quanity}
              setQuantity={setQuantity}
              maxQuantity={maxQuantity}
            />

            <div className="button-container">
              <RecipeBook selectRecipe={setSelectedRecipe} disabled={loading} />
              <Button
                size={3.65}
                disabled={
                  !selectedRecipe ||
                  !quanity ||
                  pending ||
                  crafting ||
                  loading ||
                  (!(
                    isGv2dDiamondMintEnabled() &&
                    ((selectedRecipe.softLaunch &&
                      selectedRecipe.type === 'TILE' &&
                      isCTileItemId(selectedRecipe.id)) ||
                      (selectedRecipe.type === 'INSTALLATION' &&
                        isGv2dSoftInstallCraftId(selectedRecipe.id)))
                  ) &&
                    !haveRequiredIngredients(selectedRecipe, alchemicaBalance))
                }
                color={gameConfig.gotchiverseTheme}
                onClick={async () =>
                  selectedRecipe
                    ? await handleCraft(selectedRecipe, {
                        network: currentNetwork,
                        signer: ethersSigner,
                        account: currentAccount,
                        provider: globalProvider,
                      })
                    : console.log('No recipe selected')
                }
                preventPropagation
              >
                {pending ? 'Pending...' : crafting ? 'Crafting...' : 'Craft'}
              </Button>
            </div>
          </div>
          <div className="anvil-container">
            <div className="glitter-container">
              <CraftingGlitter show={crafting} />
            </div>
            <span className="anvil-img">
              <Image alt="" src={AnvilImage} height={120} width={214} />
            </span>
            {selectedRecipe && (
              <div className="ready-container">
                <div className="crafting-alchemica-container">
                  {Object.keys(selectedRecipe.ingredients).map((alchemica, i) => {
                    return (
                      <div key={i}>
                        {selectedRecipe.ingredients[alchemica] ? (
                          <Image alt=""
                            className={`alchemica ${selectedRecipe.ingredients[alchemica] <= alchemicaBalance[alchemica] ? 'ready' : 'not-ready'}`}
                            src={getAlchemicaIcon(alchemica, gameConfig.gotchiverseTheme)}
                          />
                        ) : (
                          ''
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{styles}</style>
    </FullscreenModal>
  );
};
