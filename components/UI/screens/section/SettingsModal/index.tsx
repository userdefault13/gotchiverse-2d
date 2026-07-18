import { Modal } from 'components/UI/component/modals';
import styles from './styles';
import { useSettings } from 'contexts/SettingsContext';
import { updateSetting } from 'contexts/SettingsContext/actions';
import { GraphicSettingAction, InputSettingsAction, SoundSettingAction } from 'contexts/SettingsContext/reducer';
import { getAarcadeDiscordConnectUrl, getAarcadeProfileUrl } from 'helpers/auth.helper';
import { VerifyIcon } from 'assets';
import { AlertBox } from 'components/UI/component';
import { Radio, Toggle } from 'components/UI/elements';
import { useUser } from 'contexts/UserContext';
import { useGame } from 'contexts/GameContext';
import { useWeb3 } from 'contexts/Web3Context';
import type { CombatControlScheme } from 'types/phaser';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ open, onClose }: Props): JSX.Element => {
  const [{ gameConfig }] = useGame();
  const [{ isVerified }] = useUser();
  const [{ currentAccount }] = useWeb3();
  const aarcadeConnectUrl = getAarcadeDiscordConnectUrl(currentAccount);
  const aarcadeProfileUrl = getAarcadeProfileUrl(currentAccount);
  const [

    {
      allowAnimatedTiles,
      allowPlayerAnimation,
      allowInstallationAnimations,
      allowStarField,
      allowGotchiGlow,
      fadeGrid,
      allowMusic,
      allowSound,
      combatControls,
    },
    dispatch,
  ] = useSettings();

  const settings: Array<{
    label: string;
    options: Array<{
      name: string;
      value: boolean;
      action: GraphicSettingAction | SoundSettingAction | InputSettingsAction;
    }>;
  }> = [
    {
      label: 'Graphics',
      options: [
        {
          name: 'Animate Tiles',
          value: allowAnimatedTiles,
          action: 'UPDATE_ALLOW_ANIMATED_TILES',
        },
        {
          name: 'Animate Player',
          value: allowPlayerAnimation,
          action: 'UPDATE_ALLOW_PLAYER_ANIMATION',
        },
        {
          name: 'Animate Installations',
          value: allowInstallationAnimations,
          action: 'UPDATE_ALLOW_INSTALLATION_ANIMATIONS',
        },
        {
          name: 'Enable Starfield',
          value: allowStarField,
          action: 'UPDATE_ALLOW_STARFIELD',
        },
        {
          name: 'Enable Gotchi Glow',
          value: allowGotchiGlow,
          action: 'UPDATE_ALLOW_GOTCHI_GLOW',
        },
        {
          name: 'Fade Grid',
          value: fadeGrid,
          action: 'UPDATE_FADE_GRID',
        },
      ],
    },
    {
      label: 'Sound',
      options: [
        {
          name: 'Enable Music',
          value: allowMusic,
          action: 'UPDATE_ALLOW_MUSIC',
        },
        {
          name: 'Enable Sound effects',
          value: allowSound,
          action: 'UPDATE_ALLOW_SOUND',
        },
      ],
    },
  ];

  return (
    <Modal open={open} title="Settings" onClose={onClose} secondaryColor>
      <div className={`settings-container ${gameConfig.gotchiverseTheme}`}>
        <div className="auth pt-10">
          {isVerified === undefined && (
            <AlertBox title="Checking verification" message="Verify your account and get access to all features" type="pending" />
          )}
          {isVerified && (
            <>
              <AlertBox
                title="Verified"
                message="Your wallet is linked on Aarcade and you are in the Aavegotchi Discord"
                type="success"
              />
              <a href={aarcadeProfileUrl} target="_blank" rel="noreferrer">
                Manage on Aarcade
              </a>
            </>
          )}

          {!isVerified && isVerified !== undefined && (
            <AlertBox
              icon={VerifyIcon}
              href={aarcadeConnectUrl}
              handleClick={() => {
                if (!currentAccount) {
                  window.open('https://aarcadeghst.com', '_blank', 'noopener,noreferrer');
                  return;
                }
                window.open(aarcadeConnectUrl, '_blank', 'noopener,noreferrer');
              }}
              title="Connect Discord on Aarcade"
              message="Link Discord on Aarcade and join the Aavegotchi server to unlock features"
              type="warning"
            />
          )}
        </div>
        <div className="pt-20 pb-10 flex flex-col gap-10">
          {settings.map(({ label, options }, index) => (
            <div key={index}>
              <div className="flex gap-2">
                <h3>{label}</h3>
                <div className="option-header-decoration"></div>
              </div>
              <div className="grid grid-cols-2 gap-x-12 pt-5">
                {options.map((item, i) => {
                  return (
                    <div className="setting-container" key={i}>
                      <p>{item.name}</p>
                      <Toggle
                        checked={item.value}
                        onChange={() => updateSetting({ type: item.action, value: !item.value }, dispatch)}
                        useTheme={true}
                        color="purple"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {/* Combat Controls */}
          <div>
            <div className="flex gap-2">
              <h3>Controls</h3>
              <div className="option-header-decoration"></div>
            </div>
            <div className="grid grid-cols-2 gap-x-12 pt-5">
              <div className="setting-container radio">
                <p>Arcade (WASD)</p>
                <Radio
                  name="combat-controls"
                  size={2.5}
                  color="purple"
                  checked={combatControls === 'arcade'}
                  onChange={() => updateSetting({ type: 'UPDATE_COMBAT_CONTROLS', value: 'arcade' }, dispatch)}
                />
              </div>
              <div className="setting-container radio">
                <p>MOBA (Mouse)</p>
                <Radio
                  name="combat-controls"
                  size={2.5}
                  color="purple"
                  checked={combatControls === 'moba'}
                  onChange={() => updateSetting({ type: 'UPDATE_COMBAT_CONTROLS', value: 'moba' }, dispatch)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{styles}</style>
    </Modal>
  );
};
