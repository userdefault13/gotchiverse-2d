import GameController from 'components/controllers/GameController';
import Players from './Players';
import { Missile, RangedAttackData, Vector2 } from 'types';
import {
  getAngleByDirV2,
  getDirectionByVector360,
  getDynamics,
  getGroupMemberById,
  getOffsetByDirection,
  interpolatePositionUpdate,
  random,
  randomIntInRange,
} from 'helpers/phaser.helper';
import SFXController from 'components/controllers/SFXController';
import { scene } from 'components/controllers/SceneController';
import _ from 'lodash';
import AnimationsController from 'components/controllers/animationsController';

import GlobalState from 'contexts/GlobalState';
import Enemies from './Enemies';

let allowFire = true;
let shootTimeout;

interface MissilesInterface {
  create: (missiles: Missile[]) => void;
  onAttack: (data: RangedAttackData) => void;
  destroy: (missiles: Missile[]) => void;
  updatePosition: (missiles: Missile[]) => void;
  setAllowFire: (type: boolean, delay?: number) => void;
  destroyAll: () => void;
}

const create = (missiles: Missile[]): void => {
  if (!scene?.missiles) return;
  _.each(missiles, (missile: Missile) => {
    try {
      const { id, direction, x, y, size, isCharged } = missile;
      const [creatorId] = String(id || '').split('#');

      const creatorType = isNaN(Number(creatorId)) ? 'enemy' : 'player';

      const creator = creatorType === 'player' ? scene[creatorId] : getGroupMemberById(creatorId, 'enemiesGroup')?.[0];
      if (!creator || !direction) return;

      const offset = creatorType === 'player' ? getOffsetByDirection(direction, 30) : { x: 0, y: 0 };
      const attackType = isCharged ? 'snip' : 'shot';

      Players.checkInvisible(creatorId, 'shoot');

      let animationKey = `${attackType}_bas`;

      let enemyType;
      if (creatorType === 'enemy') {
        enemyType = creator.getData('data')?.type;
        animationKey = `${enemyType}_shot`;
      }

      const dir = getDirectionByVector360(direction);

      if (GlobalState.SETTINGS.state.allowPlayerAnimation && creatorType === 'player') {
        const muzzleKey = `${attackType}_muz`;
        const muzzleSprite = scene.add.sprite(offset.x, offset.y, muzzleKey, 0).setOrigin(0.5, 0.5);
        muzzleSprite.setAngle(-90 + getAngleByDirV2(direction));
        creator.add(muzzleSprite);
        AnimationsController.play(muzzleSprite, muzzleKey);
      } else if (enemyType === 'GMLS') {
        const animKey = `GMLS_shot_muz_${dir}`;
        const muzzleSprite = scene.add.sprite(offset.x, offset.y, 'GMLS_shot_muz', 0).setOrigin(0.5, 0.5);
        creator.add(muzzleSprite);
        SFXController.playSpatialFX([{ id: `${id}_muz`, container: creator, key: 'GMLS_shot_muz' }]);
        AnimationsController.play(muzzleSprite, animKey);
      }

      const sprite = scene.add
        .sprite(x || creator.x + offset.x, y || creator.y + offset.y, animationKey, 0)
        .setOrigin(0.5)
        .setDepth(201)
        .setDataEnabled()
        .setAngle(-90 + getAngleByDirV2(direction))
        .setData('attackType', attackType)
        .setData('created', Date.now())
        .setData('direction', direction);

      if (size) sprite.setDisplaySize(Number(size) * 2, Number(size) * 2);

      if (GlobalState.SETTINGS.state.allowPlayerAnimation) {
        AnimationsController.play(sprite, animationKey);
      }
      scene.missiles.set(id, sprite);

      if (Players.isSelectedPlayer(creatorId)) {
        if (attackType === 'snip') {
          SFXController.playFX('charge_shot');
        }
        SFXController.playFX(`shot_bas_${randomIntInRange(1, 3)}`);
      } else if (enemyType) {
        SFXController.playSpatialFX([{ id: `${id}_shot`, container: creator, key: `${enemyType}_shot` }]);
      }
    } catch (e) {
      console.warn('@Missiles.create', e);
    }
  });
};

const setAllowFire = (type: boolean, delay?: number): void => {
  if (allowFire !== type) {
    allowFire = type;
    if (delay) {
      shootTimeout = setTimeout(() => {
        allowFire = !allowFire;
      }, delay);
    } else {
      if (shootTimeout) {
        clearTimeout(shootTimeout);
      }
    }
  }
};

const updatePosition = (missiles: Missile[]): void => {
  // console.log('@Missiles.updatePosition:', missiles);
  if (!scene) return;
  _.each(missiles, (missile) => {
    const missileSprite = scene.missiles.get(missile.id);
    if (!missileSprite) return;
    if (GlobalState.SETTINGS.state.allowPlayerAnimation) tailEmitterThrottle(missile);
    interpolatePositionUpdate(missileSprite, missile);

    // if (GlobalState.GAME.state.gameConfig.enableDebugGraphics) {
    //   const x = missile.x;
    //   const y = missile.y;
    //   interpolatePositionUpdate(scene.debugObjects[missile.id], { x, y });
    // }
  });
};

const tailEmitterThrottle = _.throttle(
  (missile) => {
    // moved everything on adelay so that the last emit will not play since the missileSprite will already be destroyed
    _.delay(() => {
      const missileSprite = scene.missiles.get(missile.id);
      if (!missileSprite) return;
      const type = missileSprite.getData('attackType');
      const animationKey = `${type}_emi`;
      const emit = scene?.add.sprite(missile.x, missile.y, animationKey, 0).setDepth(10);
      AnimationsController.play(emit, animationKey);
    }, 100);
  },
  120,
  { leading: true, trailing: true },
);

const onAttack = (data: RangedAttackData): void => {
  // Sanity Check to prevent a break if players click on the scene before initial player spawn
  if (!scene[Players.selectedPlayer.id]) return;
  // prevent shooting for 5 seconds grace period
  if (scene[Players.selectedPlayer.id].isGracePeriod) {
    SFXController.playFX('cannot_attack');
    return;
  }
  const shootMode = scene?.mapConfig.SHOOT_MODE;
  const shootModeEnabled = shootMode;
  if (Date.now() - scene.lastRangedAttack < 50) return;
  if (shootModeEnabled) {
    GameController.sendData('combat', 'fire', data);
    scene.lastRangedAttack = Date.now();
  }

  if (!shootModeEnabled) SFXController.playFX('noshoot_sound');
};

const destroy = (missiles: Missile[]): void => {
  _.each(missiles, (missile: Missile) => {
    try {
      const { id } = missile;
      const [creatorId] = String(id || '').split('#');
      const objectType = creatorId.split('-')[0];
      const sprite = scene?.missiles?.get(id);
      if (!sprite || !sprite.active || !sprite.scene) {
        scene?.missiles?.delete(id);
        return;
      }

      const hitObjectType: 'wall' | 'player' = sprite.getData('hitType');
      const type = AnimationsController.getAttackDestoryTypeByHitObjectType(hitObjectType) || 'air';
      let posToDestroy = { x: sprite.x, y: sprite.y };
      if (sprite.data?.has?.('playerHitId')) {
        const playerHitId = sprite.getData('playerHitId');
        const hitPlayer = scene[playerHitId];
        if (hitPlayer) posToDestroy = { x: hitPlayer.x, y: hitPlayer.y };
      }
      const destroyAnimKey = `shot_${type}`;
      const destroyAnim = scene.add.sprite(posToDestroy.x, posToDestroy.y, destroyAnimKey, 0).setDepth(500);

      const direction: Vector2 = sprite.getData('direction');
      if (direction) destroyAnim.setAngle(-90 + getAngleByDirV2(direction));

      AnimationsController.play(destroyAnim, destroyAnimKey);

      try {
        sprite.setVisible(false);
      } catch {
        /* ignore */
      }

      if (Players.isSelectedPlayer(creatorId)) {
        const player = scene[Players.selectedPlayer.id];
        if (player) {
          const damageType = getDynamics(player.getData('damageDiff'));
          if (type === 'dud') SFXController.playFX(`shot_dud_${randomIntInRange(1, 3)}`);
          if (type === 'imp' && damageType) SFXController.playFX(`shot_imp_${damageType}`);

          if (sprite.getData('hitObjectType') === 'enemy') {
            const hitObjectId = sprite.getData('hitObjectId');
            Enemies.applyEnemyHitVfx(hitObjectId, true);
            SFXController.playSpatialFX([{ id: `${creatorId}_hit`, container: sprite, key: 'GMLS_hit' }]);
          }
        }
      }
      if (objectType === 'GMLS') {
        const gmlsContainers = getGroupMemberById(creatorId, 'enemiesGroup');
        if (gmlsContainers) {
          const impactVfx = scene.add.sprite(sprite.x, sprite.y, 'GMLS_imp', 0).setDepth(500);
          if (direction) impactVfx.setAngle(-90 + getAngleByDirV2(direction));
          AnimationsController.play(impactVfx, 'GMLS_imp');
          SFXController.playSpatialFX([{ id: `${creatorId}_imp`, container: sprite, key: 'GMLS_imp' }]);
        }
      }

      try {
        sprite.destroy(true);
      } catch {
        /* already destroyed */
      }
      scene.missiles.delete(id);
    } catch (e) {
      console.warn('@Missiles.destroy', e);
    }
  });
};

const destroyAll = () => {
  if (scene.missiles) {
    scene.missiles.forEach((missile) => {
      missile.destroy(true);
    });
    scene.missiles = new Map();
  }
};

const getProjectileType = (): string => {
  if (GlobalState.GAME.state.gameConfig.gotchiverseTheme === 'halloween') {
    return random(['skull', 'bone']);
  } else if (GlobalState.GAME.state.gameConfig.gotchiverseTheme === 'tooorkey') {
    return 'pie';
  } else {
    return 'heart';
  }
};

const Missiles: MissilesInterface = {
  create,
  onAttack,
  updatePosition,
  setAllowFire,
  destroy,
  destroyAll,
};

export default Missiles;
