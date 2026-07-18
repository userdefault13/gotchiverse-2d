import { CombatControlScheme } from 'types/phaser';
import { Action, Setting, getAction, GraphicSettingAction, SoundSettingAction, InputSettingsAction } from './reducer';

export const updateSetting = (
  action: { type: GraphicSettingAction | SoundSettingAction | InputSettingsAction; value: boolean | CombatControlScheme },
  dispatch: React.Dispatch<Action>,
): void => {
  window.localStorage.setItem(
    action.type.replace('UPDATE_', ''),
    typeof action.value === 'boolean' ? (action.value ? 'TRUE' : 'FALSE') : action.value,
  );

  dispatch(getAction(action.type, action.value));
};

export const fetchLocalSettings = (dispatch: React.Dispatch<Action>): void => {
  Object.keys(Setting).forEach((key: keyof typeof Setting) => {
    const value = window.localStorage.getItem(key.replace('UPDATE_', ''));

    if (value !== null) {
      const action = getAction(key, ['TRUE', 'FALSE'].includes(value) ? value === 'TRUE' : value);

      dispatch(action);
    }
  });
};
