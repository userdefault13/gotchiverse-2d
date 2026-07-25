import AnimationsController from 'components/controllers/animationsController';
import GameController from 'components/controllers/GameController';
import { scene } from 'components/controllers/SceneController';
import SFXController from 'components/controllers/SFXController';
import GlobalState from 'contexts/GlobalState';
import { getAngleByDirV2, getDynamics, getOffsetByDirection, getOriginByDirection, interpolatePositionUpdate } from 'helpers/phaser.helper';
import _ from 'lodash';

import { RushAttackData, AttackEvent, MeleeShape, AttackDestroyType, Vector2 } from 'types';
import Players from './Players';
import Enemies from './Enemies';

// let onAttack = false;

interface MeleeInterface {
  sendMeleeAttack: (data: RushAttackData) => void;
  handleEvent: (data: AttackEvent) => void;
  create: (data: MeleeShape[]) => void;
  destroy: (data: MeleeShape[]) => void;
  destroyAll: () => void;
}

const sendMeleeAttack = (data: RushAttackData): void => {
  const player = scene[Players.selectedPlayer?.id];
  if (player?.isGracePeriod) {
    SFXController.playFX('cannot_attack');
    return;
  }

  if (Date.now() - (scene.lastMeleeAttack || 0) < 50) return;
  GameController.sendData('combat', 'melee', data);
  scene.lastMeleeAttack = Date.now();
  scene.lastRangedAttack = Date.now();
};

const handleEvent = (data) => {
  const { action, melee } = data;

  if (GlobalState.GAME.state.gameConfig.enableDebugGraphics) {
    switch (action) {
      case 'move':
        moveMelee(melee.id, melee.x, melee.y);
        break;
      // case 'destroy':
      //   destroyMelee(melee.id);
      //   break;
    }
  }
};

const create = (melees: MeleeShape[]): void => {
  // console.log('@melee.create:', melees);
  _.each(melees, (melee: MeleeShape) => {
    const { id, direction, isRush, size } = melee;

    const [playerId] = id.split('_');
    const player = scene[playerId];
    if (!player) return;
    Players.checkInvisible(playerId, 'shoot');
    const attackType = isRush ? 'rush' : 'slap';
    if (GlobalState.SETTINGS.state.allowPlayerAnimation && isRush) {
      const key = `${attackType}_muz`;
      const offset = getOffsetByDirection(direction, 100);
      const muzzle = scene.add.sprite(player.x + offset.x, player.y + offset.y, `${attackType}_muz`, 0).setDepth(400);
      // player.add(muzzle);
      AnimationsController.play(muzzle, key);
    }

    const animationKey = `${attackType}_bas`;
    const pos = { x: isRush ? 0 : player.x, y: isRush ? 0 : player.y };

    const sprite = scene.add
      .sprite(pos.x, pos.y, animationKey, 0)
      .setDepth(201)
      .setDataEnabled()
      // .setAngle(getAngleByDirV2(direction)) /
      .setData('created', Date.now())
      .setData('attackType', attackType); // Save is rush

    if (isRush) {
      const tra = scene.add.sprite(0, 0, 'rush_tra', 0).setOrigin(0.5, 0.5).setDepth(201);
      AnimationsController.play(tra, 'rush_tra');

      if (direction) {
        const angle = getAngleByDirV2(direction);
        const { x, y } = getOffsetByDirection(direction, 30);
        tra.setAngle(angle - 90).setPosition(-x, -y);
        sprite.setData('direction', direction).setAngle(angle).setPosition(x, y);
      }

      player.add([sprite, tra]);
    } else {
      sprite.setDisplaySize(size * 2, size * 2);
    }

    if (GlobalState.SETTINGS.state.allowPlayerAnimation) AnimationsController.play(sprite, animationKey);
    scene.meleeGroup.set(id, sprite);
    if (Players.isSelectedPlayer(playerId)) {
      SFXController.playFX(`${attackType}_bas`);
      // SFXController.fadeIn('shoot_heart');
    }
    // if (GlobalState.GAME.state.gameConfig.enableDebugGraphics) {
    //   if (!scene.debugObjects) scene.debugObjects = {};
    //   scene.debugObjects[id] = scene.add.image(x, y, 'debugSquare').setDepth(500).setDisplaySize(size, size).setOrigin(0.5);
    // }
  });
};

const moveMelee = (id: string, x: number, y: number): void => {
  // console.log('Moving ', id, ' to ', x, y);
  if (scene.debugObjects?.[id]) interpolatePositionUpdate(scene.debugObjects[id], { x, y });
  // const player = scene[id.split('_')[0]];
  // if (!player) return;

  tailEmitterThrottle(id, x, y);
};

const tailEmitterThrottle = _.throttle(
  (id, x, y) => {
    const melee = scene.meleeGroup.get(id);
    if (!melee) return;
    const type = melee.getData('attackType');
    if (type !== 'rush') return; // no emitter for slap!

    const animationKey = `${type}_emi`;
    const emit = scene.add.sprite(x, y, animationKey, 0).setDepth(10);
    AnimationsController.play(emit, animationKey);
  },
  150,
  { leading: true, trailing: true },
);

const destroy = (melees: MeleeShape[]): void => {
  _.each(melees, (melee: MeleeShape) => {
    const { id } = melee;
    const [creatorId, meleeId] = id.split('_');

    const sprite = scene.meleeGroup.get(id);

    if (!sprite) return;
    // console.warn('@Melee.destroy: No Sprite found for id:', melee, sprite);

    const hitPlayerId = sprite.getData('playerHitId');
    const hitPlayer = scene[hitPlayerId] || undefined;
    // destroy anim only if no animation, since the animaiton always destroys it at the end of 1 loop.
    if (!GlobalState.SETTINGS.state.allowPlayerAnimation) sprite.destroy();

    const attackType = sprite.getData('attackType') || 'rush';
    // console.log('@Melee attackType', attackType);
    const hitObjectType: 'wall' | 'player' = sprite.getData('hitType');
    // console.log('@Melee.destroy:hitObjectType', hitObjectType);
    const type = AnimationsController.getAttackDestoryTypeByHitObjectType(hitObjectType);

    if (hitPlayer) {
      const destroyAnimKey = `${attackType}_${type}`;
      const destroyAnim = scene.add.sprite(hitPlayer.x, hitPlayer.y, destroyAnimKey, 0).setDepth(500);

      const direction: Vector2 = sprite.getData('direction');
      if (direction) destroyAnim.setAngle(getAngleByDirV2(direction));
      AnimationsController.play(destroyAnim, destroyAnimKey);
    }

    // impact sfx will play from gotchi-damage
    if (Players.isSelectedPlayer(creatorId)) {
      if (attackType === 'slap') {
        if (type !== 'imp') {
          // slap_air, slap_dud
          SFXController.playFX(`${attackType}_${type}`);
        }
      } else {
        // only rush_dud
        SFXController.playFX(`${attackType}_dud`);
      }

      const player = scene[Players.selectedPlayer.id];
      if (!player) return;
      const damageType = getDynamics(player.getData('damageDiff'));
      if (damageType) SFXController.playFX(`${attackType}_imp_${damageType}`);

      // gotchi melee hit GMLS
      if (sprite && sprite.getData('hitObjectType') === 'enemy') {
        const hitObjectId = sprite.getData('hitObjectId');
        Enemies.applyEnemyHitVfx(hitObjectId, true);
        SFXController.playSpatialFX([{ id: `${creatorId}_hit`, container: sprite, key: 'GMLS_hit' }]);
      }
    }

    scene.meleeGroup.delete(id);
    if (GlobalState.GAME.state.gameConfig.enableDebugGraphics) {
      if (scene.debugObjects?.[id]) scene.debugObjects[id]?.destroy();
    }
    // UPDATE FOR SOUND
    // if (Players.isSelectedPlayer(playerId)) SFXController.playSpatialFX([{ id, x: sprite.x, y: sprite.y, key: `impact_${type}` }]);
  });
};

const destroyAll = () => {
  if (scene.meleeGroup) {
    scene.meleeGroup.forEach((enemy) => {
      enemy.destroy();
    });
    scene.meleeGroup = new Map();
  }
};

// object to import
const Melee: MeleeInterface = {
  sendMeleeAttack,
  handleEvent,
  create,
  destroy,
  destroyAll,
};

export default Melee;
