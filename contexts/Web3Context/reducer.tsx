import { State } from './store';

export type Action =
  | { type: 'UPDATE_AUTH_TOKEN'; authToken: State['authToken'] }
  | { type: 'UPDATE_ETHERS_SIGNER'; ethersSigner: State['ethersSigner'] }
  | { type: 'UPDATE_SECONDARY_SIGNER'; secondarySigner: State['secondarySigner'] }
  | { type: 'UPDATE_ETHERS_SIGNITURE'; ethersSigniture: State['ethersSigniture'] }
  | { type: 'UPDATE_METATRANSACTIONS_CONTRACT'; metaTransactionContract: State['metaTransactionContract'] }
  | { type: 'UPDATE_GLOBAL_PROVIDER'; globalProvider: State['globalProvider'] }
  | { type: 'UPDATE_SECONDARY_PROVIDER'; secondaryProvider: State['secondaryProvider'] }
  | { type: 'UPDATE_MATIC_PROVIDER'; maticProvider: State['maticProvider'] }
  | { type: 'UPDATE_CURRENT_ACCOUNT'; currentAccount: State['currentAccount'] }
  | { type: 'UPDATE_CURRENT_NETWORK'; currentNetwork: State['currentNetwork'] }
  | { type: 'UPDATE_SECONDARY_NETWORK'; secondaryNetwork: State['secondaryNetwork'] }
  | { type: 'HANDLE_LOGOUT' }
  | { type: 'START_ASYNC' }
  | { type: 'END_ASYNC' };

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'UPDATE_AUTH_TOKEN':
      return {
        ...state,
        authToken: action.authToken,
      };
    case 'UPDATE_ETHERS_SIGNER':
      return {
        ...state,
        ethersSigner: action.ethersSigner,
      };
    case 'UPDATE_SECONDARY_SIGNER':
      return {
        ...state,
        secondarySigner: action.secondarySigner,
      };
    case 'UPDATE_ETHERS_SIGNITURE':
      return {
        ...state,
        ethersSigniture: action.ethersSigniture,
      };
    case 'UPDATE_METATRANSACTIONS_CONTRACT':
      return {
        ...state,
        metaTransactionContract: action.metaTransactionContract,
      };
    case 'UPDATE_GLOBAL_PROVIDER':
      return {
        ...state,
        globalProvider: action.globalProvider,
      };
    case 'UPDATE_SECONDARY_PROVIDER':
      return {
        ...state,
        secondaryProvider: action.secondaryProvider,
      };
    case 'UPDATE_MATIC_PROVIDER':
      return {
        ...state,
        maticProvider: action.maticProvider,
      };
    case 'UPDATE_CURRENT_ACCOUNT':
      return {
        ...state,
        currentAccount: action.currentAccount,
      };
    case 'UPDATE_CURRENT_NETWORK':
      return {
        ...state,
        currentNetwork: action.currentNetwork,
      };
    case 'UPDATE_SECONDARY_NETWORK':
      return {
        ...state,
        secondaryNetwork: action.secondaryNetwork,
      };
    case 'HANDLE_LOGOUT':
      if (typeof window !== 'undefined') {
        try {
          // Soft Bitcoin pin must not survive logout.
          localStorage.removeItem('aarcadeSoftNetwork');
          localStorage.removeItem('aarcadeBtcAddress');
        } catch {
          /* ignore */
        }
      }
      return {
        ...state,
        currentNetwork: undefined,
        currentAccount: undefined,
        globalProvider: undefined,
        ethersSigner: undefined,
        secondaryNetwork: undefined,
        secondaryProvider: undefined,
        secondarySigner: undefined,
      };
    case 'START_ASYNC':
      return {
        ...state,
        web3Loading: true,
      };
    case 'END_ASYNC':
      return {
        ...state,
        web3Loading: false,
      };
    default:
      return state;
  }
};
