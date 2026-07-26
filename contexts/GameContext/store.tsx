import _ from 'lodash';
import { GAME_CONFIG } from 'shared_code/constants/const.game';
import { GameConfig } from 'shared_code/types/config.types';

// Deep clone the config to avoid mutation
const initialConfig: GameConfig = _.cloneDeep(GAME_CONFIG as unknown as GameConfig);

// create a Partial type to allow partial updates. This is the same as GameConfig but all fields are optional
export type GameConfigPartial = Partial<GameConfig>;

export interface State {
  activeCount: number;
  aarenaCount: number;
  /** Robinhood Chain aarena-rh room CCU */
  aarenaRhCount: number;
  gameConfig: GameConfig;
}

export const initialState: State = {
  aarenaCount: 0,
  aarenaRhCount: 0,
  activeCount: 0,
  gameConfig: initialConfig,
};
