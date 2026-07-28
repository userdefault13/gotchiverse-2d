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
  const [{ alchemicaBalance }, userDispatch] = useUser();

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
    await fetchAndSetAlchemicaBalance({ account, network, provider }, userDispatch);
    setPending(false);
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

    // Waalls / Lodges / Store are not on InstallationDiamond — craft into local inventory (demo / PoC).
    // Console crafts from RecipeBook into the store furniture bag (requires a title pick).
    if (recipe.type === 'INSTALLATION' && (isWaallItemId(recipe.id) || isLodgeItemId(recipe.id) || isStoreItemId(recipe.id))) {
      let notificationId;
      try {
        const isLodge = isLodgeItemId(recipe.id);
        const isStore = isStoreItemId(recipe.id);
        notificationId = showTransactionNotification(notificationDispatch, {
          message: isStore ? 'Crafting Store (local)' : isLodge ? 'Crafting Lodge (local)' : 'Crafting Waall (local)',
        });
        const result = isStore
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

    // console.log('craftingContract', contract, 'recipe', recipe, ' contractCall', contractCall);

    let notificationId, tx;
    const craftItems = _.fill(Array(quanity), recipe.id);
    // console.log('craftItems', quanity, craftItems);

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
      // const tx =
      //   recipe.type === 'INSTALLATION'
      //     ? await contract.craftInstallations(
      //         craftItems,
      //         craftItems.map(() => 0),
      //         { ...(await gasPriceDict(ethersSigner)) },
      //       )
      //     : await contract.craftTiles(craftItems, { ...(await gasPriceDict(ethersSigner)) });
      craft();
      const transaction = await tx.wait();
      if (transaction.status === 1) {
        updateTransactionNotificationStatus(notificationDispatch, notificationId, 'success');
        setCrafting(true);
        setPending(false);

        await fetchAndSetAlchemicaBalances(config.account, config.network, config.provider);

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
    if (currentAccount && currentNetwork && globalProvider && selectedRecipe && !isWaallItemId(selectedRecipe.id) && !isLodgeItemId(selectedRecipe.id) && !isStoreItemId(selectedRecipe.id)) {
      void fetchAndSetAllowance(currentAccount, currentNetwork, globalProvider, selectedRecipe);
    }
  }, [selectedRecipe, currentAccount, currentNetwork, globalProvider]);

  useEffect(() => {
    if (selectedRecipe && alchemicaBalance) {
      const max = getMaxQuantity(selectedRecipe.ingredients, alchemicaBalance);
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
    !isWaallItemId(selectedRecipe.id) &&
    !isLodgeItemId(selectedRecipe.id) &&
    !isStoreItemId(selectedRecipe.id) &&
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
                disabled={!selectedRecipe || !quanity || !haveRequiredIngredients(selectedRecipe, alchemicaBalance) || pending || crafting || loading}
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
