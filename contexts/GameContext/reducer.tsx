/* eslint-disable @typescript-eslint/indent */
import _ from 'lodash';
import { GameConfigPartial, State } from './store';

export type Action =
  | {
      type: 'UPDATE_ACTIVE_COUNT';
      activeCount: State['activeCount'];
    }
  | {
      type: 'UPDATE_AARENA_COUNT';
      aarenaCount: State['aarenaCount'];
    }
  | {
      type: 'UPDATE_AARENA_RH_COUNT';
      aarenaRhCount: State['aarenaRhCount'];
    }
  | {
      type: 'UPDATE_GAME_CONFIG';
      gameConfig: GameConfigPartial;
    };

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'UPDATE_ACTIVE_COUNT':
      return { ...state, activeCount: action.activeCount };
    case 'UPDATE_AARENA_COUNT':
      return { ...state, aarenaCount: action.aarenaCount };
    case 'UPDATE_AARENA_RH_COUNT':
      return { ...state, aarenaRhCount: action.aarenaRhCount };

    case 'UPDATE_GAME_CONFIG':
      return { ...state, gameConfig: _.assign({ ...state.gameConfig }, action.gameConfig) };
    default:
      return state;
  }
};
