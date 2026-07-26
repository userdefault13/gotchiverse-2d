import Players from 'components/phaser/Players';
import { Direction, MouseActiveData, QuickslotIndex, RangedAttackData, RushAttackData, Hand, Vector2 } from 'types';
import Installations from 'components/phaser/Installations';
import GameController from './GameController';
import { updateWithdrawDialog } from 'contexts/UIContexts/actions';
import _ from 'lodash';
import Missiles from 'components/phaser/Missiles';
import Melee from 'components/phaser/Melee';
import SFXController from './SFXController';
import { setActiveBrush } from 'contexts/UserContext/actions';
import { scene } from 'components/controllers/SceneController';
import GlobalState from 'contexts/GlobalState';
import { getAngleByDirV2 } from 'helpers/phaser.helper';
import { GOTCHI_SIZE, GAME_CONFIG } from 'shared_code/constants/const.game';
import { isTrueSpectator } from 'helpers/gotchi.helper';
import { getItemCooldownLeft, handleDrop, handleQuickslotAction } from 'helpers/items.helpers';
import type { ShootMode } from 'types/phaser';

interface inputControllerInterface {
  init: () => void;
  handleKeyboardMovement: () => void;
  toggleMouseMovement: (active: boolean) => void;
  updateDisableKeyboard: (value: boolean, includeMouseMovement?: boolean) => void;
  updateChatToggle: (value: boolean) => void;
  updateChatBarToggle: (value: boolean) => void;
  registerAttackHandle?: () => void;
  isSprinting: () => boolean;
  updateShootMode: (scheme?: string) => void;
}

const blurAll = () => {
  (document.activeElement as HTMLElement).blur();
};

let isAlternativeAttack = false;
let keyPressCount = 0;
let toggleDebug = false;
let shootMode: ShootMode;
let chargeTimer = null;
let mouseCharging = false;
let keyboardCharging = false;

const keyDownsData = {
  UP: { isPressed: false, pressSequence: 0 },
  DOWN: { isPressed: false, pressSequence: 0 },
  LEFT: { isPressed: false, pressSequence: 0 },
  RIGHT: { isPressed: false, pressSequence: 0 },
};

const init = (): void => {
  if (!scene) return;
  resetKeyDownsData();
  createInputs();
  handleSprint();
  recordAlternativeAttack();
  // attach events to the keys
  toggleMouseMovement(true);
  handleToggleDebug();
  scene.toggleMinimap = true;
  handleToggleMinimap();
  handleToggleBubbleChat();
  handleExitBuildMode();
  handleToggleChat();
  handlePlayerKeys();
  registerAttackHandle();
  shootMode = scene.mapConfig.SHOOT_MODE;
};

function createInputs() {
  scene.chatKeys = {
    heart: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H, false),
    exclam: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I, false),
    happy: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F, false),
    unhappy: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y, false),
    omg: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O, false),
    fire: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V, false),
    lightning: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L, false),
    action: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false),
  };

  // wasd key movment
  scene.wasdKeys = {
    W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
    S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
    A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
    D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
  };

  // cursor keys movment
  scene.cursorKeys = {
    left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, false),
    right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, false),
    up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false),
    down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, false),
    shift: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, false),
  };

  scene.combatKeys = {
    left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q, false),
    right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R, false),
    otherLeft: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U, false),
    otherRight: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P, false),
    space: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false),
  };

  // gotchi spin

  scene.actionKeys = {
    spinKey: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N, false),
    M: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M, false), // MINIMAP
    B: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B, false, true), // BUBBLE CHAT
    T: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T, false, true), // CHAT
    F3: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3), // DEBUG
    Esc: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC), // EXIT BUILD MODE
  };

  scene.itemHotKeys = {
    ONE: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE, false),
    TWO: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO, false),
    THREE: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE, false),
    FOUR: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR, false),
    SEVEN: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN, false),
    EIGHT: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT, false),
    NINE: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NINE, false),
    ZERO: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ZERO, false),
  };

  scene.input.setPollAlways();

  invokeKeyboardKeys();
  registerItemHotKeys();
}

enum AttackType {
  Melee = 'melee',
  Ranged = 'ranged',
}

function handleAttackKeyDown(side: Hand): void {
  if (!Players?.selectedPlayer || mouseCharging || scene.disableKeyboard || isTrueSpectator(Players.selectedPlayer.isSpectator)) return;

  const attackType = getAttackType(side);
  const chargeType = attackType === AttackType.Melee ? 'isMeleeCharging' : 'isMissileCharging';
  const player = scene[Players?.selectedPlayer.id];

  if (player.getData('isMeleeCharging') || player.getData('isMissileCharging')) return;

  keyboardCharging = true;
  if (attackType === AttackType.Melee) {
    scene.meleeChargeStartTimestamp = Date.now();
  } else {
    scene.rangedChargeStartTimestamp = Date.now();
  }
  triggerChargeVfx(attackType);
  player.setData(chargeType, true);

  const minChargeDuration = attackType === AttackType.Melee ? GAME_CONFIG.minRushChargeDuration : GAME_CONFIG.minSnipeChargeDuration;

  if (chargeTimer) clearTimeout(chargeTimer);
  chargeTimer = setTimeout(() => {
    // start timer
    const pointer = scene.game.input.activePointer;
    const pointerWorld = { x: pointer.worldX, y: pointer.worldY };
    handleChargedRangedAnim(attackType, pointerWorld);
    updateChargingAnim(pointerWorld);
  }, minChargeDuration * 1000);
}

function handleAttackKeyUp(side: Hand): void {
  if (!Players?.selectedPlayer || mouseCharging || scene.disableKeyboard || isTrueSpectator(Players.selectedPlayer.isSpectator)) return;
  const player = scene[Players?.selectedPlayer.id];

  const attackType = getAttackType(side);
  const chargeType = attackType === AttackType.Melee ? 'isMeleeCharging' : 'isMissileCharging';
  if (!player.getData(chargeType)) return;

  player.chargedContainer?.destroy();
  keyboardCharging = false;

  player.setData(chargeType, false);
  handleClickAttack(scene.game.input.activePointer, attackType, side);
}

// responsible for melee and missile attack
// attach event on key press rather than using update
function registerAttackHandle(): void {
  scene.combatKeys.left.on('down', () => {
    handleAttackKeyDown(Hand.Left);
  });

  scene.combatKeys.left.on('up', () => {
    handleAttackKeyUp(Hand.Left);
  });

  scene.combatKeys.otherLeft.on('down', () => {
    handleAttackKeyDown(Hand.Left);
  });

  scene.combatKeys.otherLeft.on('up', () => {
    handleAttackKeyUp(Hand.Left);
  });

  scene.combatKeys.right.on('down', () => {
    handleAttackKeyDown(Hand.Right);
  });

  scene.combatKeys.right.on('up', () => {
    handleAttackKeyUp(Hand.Right);
  });

  scene.combatKeys.otherRight.on('down', () => {
    handleAttackKeyDown(Hand.Right);
  });

  scene.combatKeys.otherRight.on('up', () => {
    handleAttackKeyUp(Hand.Right);
  });
}

// 10
function triggerChargeVfx(attackType: AttackType): void {
  if (GlobalState.GAME.state.gameConfig.chargedRangeAPCost < 10 && attackType === AttackType.Ranged) {
    SFXController.playFX('noshoot');
    return;
  }
  if (GlobalState.GAME.state.gameConfig.rushAPCost < 20 && attackType === AttackType.Melee) {
    SFXController.playFX('noshoot');
    return;
  }

  if (chargeTimer) clearTimeout(chargeTimer);
  chargeTimer = setTimeout(
    () => {
      // start timer
      const pointerWorld = { x: scene.game.input.activePointer.worldX, y: scene.game.input.activePointer.worldY };
      handleChargedRangedAnim(attackType, pointerWorld);
      updateChargingAnim(pointerWorld);
    },
    attackType === AttackType.Ranged
      ? GlobalState.GAME.state.gameConfig.minSnipeChargeDuration * 1000
      : GlobalState.GAME.state.gameConfig.minRushChargeDuration * 1000,
  );
}

function registerItemHotKeys(): void {
  scene.itemHotKeys.ONE.on('down', () => handleQuickslot(0));
  scene.itemHotKeys.TWO.on('down', () => handleQuickslot(1));
  scene.itemHotKeys.THREE.on('down', () => handleQuickslot(2));
  scene.itemHotKeys.FOUR.on('down', () => handleQuickslot(3));

  scene.itemHotKeys.SEVEN.on('up', () => handleDrop('FUD'));
  scene.itemHotKeys.EIGHT.on('up', () => handleDrop('FOMO'));
  scene.itemHotKeys.NINE.on('up', () => handleDrop('ALPHA'));
  scene.itemHotKeys.ZERO.on('up', () => handleDrop('KEK'));
}

function handlePlayerKeys(): void {
  scene.chatKeys.heart.on('down', () => {
    if (!scene.disableKeyboard) {
      SFXController.playFX('emote');
      const data = { label: 'heart_chat' };
      GameController.sendData('interaction', 'emote', data);
    }
  });

  scene.chatKeys.exclam.on('down', () => {
    if (!scene.disableKeyboard) {
      SFXController.playFX('emote');
      const data = { label: 'exclam_chat' };
      GameController.sendData('interaction', 'emote', data);
    }
  });

  scene.chatKeys.happy.on('down', () => {
    if (!scene.disableKeyboard) {
      SFXController.playFX('emote');
      const data = { label: 'happy_chat' };
      GameController.sendData('interaction', 'emote', data);
    }
  });

  scene.chatKeys.unhappy.on('down', () => {
    if (!scene.disableKeyboard) {
      SFXController.playFX('emote');
      const data = { label: 'unhappy_chat' };
      GameController.sendData('interaction', 'emote', data);
    }
  });

  scene.chatKeys.omg.on('down', () => {
    if (!scene.disableKeyboard) {
      SFXController.playFX('emote');
      const data = { label: 'omg_chat' };
      GameController.sendData('interaction', 'emote', data);
    }
  });

  scene.chatKeys.fire.on('down', () => {
    if (!scene.disableKeyboard) {
      SFXController.playFX('emote');
      const data = { label: 'fire_chat' };
      GameController.sendData('interaction', 'emote', data);
    }
  });

  scene.chatKeys.lightning.on('down', () => {
    if (!scene.disableKeyboard) {
      SFXController.playFX('emote');
      const data = { label: 'lightning_chat' };
      GameController.sendData('interaction', 'emote', data);
    }
  });

  // INTERACT key
  scene.chatKeys.action.on('down', () => {
    if (!scene.disableKeyboard) {
      if (scene.activeDeposit && scene.currentDepositId !== undefined && !scene.disableKeyboard) {
        // console.log('#deposit vortex');
        updateWithdrawDialog(
          { withdrawDialogState: true, alchemica: scene.currentAlchemica || [0, 0, 0, 0], depositId: scene.currentDepositId },
          GlobalState.UI.dispatch,
        );
      }
    }
  });
}

function handleQuickslot(slot: QuickslotIndex): void {
  // handle slot items
  if (scene.disableKeyboard || !GlobalState.GAME.state.gameConfig.enableGotchiInventory) return;
  const quickslotsByIndex = _.keyBy(GlobalState.REALM.state.userQuickslots, 'slotIndex');
  const quickslotItem = quickslotsByIndex[slot];

  if (quickslotItem?.quantity) {
    const cooldownLeft = getItemCooldownLeft(quickslotItem);
    if (cooldownLeft) return;
    handleQuickslotAction(slot);
  }
}

function handleKeyboardMovement(): void {
  if (scene && GlobalState.SETTINGS.state.combatControls === 'arcade') {
    const lastKey = _.maxBy(_.keys(keyDownsData), (o) => {
      return keyDownsData[o].pressSequence;
    });

    if (keyDownsData[lastKey].pressSequence > 0 && keyDownsData[lastKey].isPressed === true) {
      // console.log(`left:${keyDownsData.LEFT.pressSequence} right:${keyDownsData.RIGHT.pressSequence} up:${keyDownsData.UP.pressSequence} down:${keyDownsData.DOWN.pressSequence}`);
      const dir: Direction = Direction[lastKey];
      Players.updateServerDirection(dir, scene.isSprint);
    } else if (!scene.isMoving && keyPressCount !== 0) {
      // Don't send none if player is moving with mouse
      keyPressCount = 0;
      Players.updateServerDirection(Direction.NONE, scene.isSprint);
    }
  }
} // end function

function keyDown(key: string) {
  if (!scene.disableKeyboard) {
    scene.isMoving = true;
    keyPressCount += 1;
    keyDownsData[key].isPressed = true;
    keyDownsData[key].pressSequence = keyPressCount;
  }
}

function keyUp(key: string) {
  scene.isMoving = false;
  keyDownsData[key].isPressed = false;
  keyDownsData[key].pressSequence = 0;
}

function invokeKeyboardKeys() {
  scene.wasdKeys.A.on('down', () => {
    keyDown('LEFT');
  });
  scene.wasdKeys.D.on('down', () => {
    keyDown('RIGHT');
  });
  scene.wasdKeys.W.on('down', () => {
    keyDown('UP');
  });
  scene.wasdKeys.S.on('down', () => {
    keyDown('DOWN');
  });

  scene.wasdKeys.A.on('up', () => {
    keyUp('LEFT');
  });
  scene.wasdKeys.D.on('up', () => {
    keyUp('RIGHT');
  });
  scene.wasdKeys.W.on('up', () => {
    keyUp('UP');
  });
  scene.wasdKeys.S.on('up', () => {
    keyUp('DOWN');
  });

  //  cursorkeys
  scene.cursorKeys.left.on('down', () => {
    keyDown('LEFT');
  });
  scene.cursorKeys.right.on('down', () => {
    keyDown('RIGHT');
  });
  scene.cursorKeys.up.on('down', () => {
    keyDown('UP');
  });
  scene.cursorKeys.down.on('down', () => {
    keyDown('DOWN');
  });

  scene.cursorKeys.left.on('up', () => {
    keyUp('LEFT');
  });
  scene.cursorKeys.right.on('up', () => {
    keyUp('RIGHT');
  });
  scene.cursorKeys.up.on('up', () => {
    keyUp('UP');
  });
  scene.cursorKeys.down.on('up', () => {
    keyUp('DOWN');
  });
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }
  return { x: Number((vector.x / magnitude).toFixed(3)), y: Number((vector.y / magnitude).toFixed(3)) };
}

// Subtracts two vectors.
function subtractVectors(vectorA, vectorB) {
  return {
    x: vectorA.x - vectorB.x,
    y: vectorA.y - vectorB.y,
  };
}

function computeMeleeChargeDuration(): number {
  const chargeDuration = (Date.now() - scene.meleeChargeStartTimestamp - GlobalState.GAME.state.gameConfig.minRushChargeDuration * 1000) / 1000;
  return chargeDuration;
}

function computeRangedChargeDuration(): number {
  const chargeDuration = (Date.now() - scene.rangedChargeStartTimestamp - GlobalState.GAME.state.gameConfig.minSnipeChargeDuration * 1000) / 1000;
  return chargeDuration;
}

function handleClickAttack(pointer: Phaser.Input.Pointer, type: AttackType, hand: Hand): void {
  // if (GameController.MAP !== 'aarena') return;
  const playerObject = scene[Players.selectedPlayer.id];
  if (!playerObject || isTrueSpectator(Players.selectedPlayer.isSpectator)) return;
  // Prefer live mapConfig — module `shootMode` can stay stale across citaadel→aarena.
  if (!scene?.mapConfig?.SHOOT_MODE && !shootMode) return;

  const pointerWorld = {
    x: pointer.worldX,
    y: pointer.worldY,
  };
  let direction = normalizeVector(subtractVectors(pointerWorld, playerObject));
  // Server drops 0,0 dirs silently — fall back to last WASD / default facing.
  if (direction.x === 0 && direction.y === 0) {
    direction = directionFromLastMove();
  }
  if (type === AttackType.Melee) {
    const duration = computeMeleeChargeDuration();
    // console.log('Rush chared for ', duration, 'seconds');
    const data: RushAttackData = {
      hand,
      direction,
      chargeDuration: duration,
    };
    Melee.sendMeleeAttack(data);
  } else if (type === AttackType.Ranged) {
    let duration = 0;
    if (GlobalState.GAME.state.gameConfig.enableRangedCharge) {
      duration = computeRangedChargeDuration();
    }
    const data: RangedAttackData = {
      hand,
      direction,
      chargeDuration: duration,
    };
    Missiles.onAttack(data);
  }
}

function directionFromLastMove(): { x: number; y: number } {
  switch (scene?.lastUpdate?.direction) {
    case Direction.LEFT:
      return { x: -1, y: 0 };
    case Direction.RIGHT:
      return { x: 1, y: 0 };
    case Direction.UP:
      return { x: 0, y: -1 };
    case Direction.DOWN:
      return { x: 0, y: 1 };
    default:
      return { x: 0, y: 1 };
  }
}

function getAttackType(side: Hand): AttackType {
  if (side === Hand.Right) {
    const w = GlobalState.REALM.state.rightWeapon || 'Ranged Weapon';
    return w === 'Melee Weapon' ? AttackType.Melee : AttackType.Ranged;
  }
  const w = GlobalState.REALM.state.leftWeapon || 'Melee Weapon';
  return w === 'Melee Weapon' ? AttackType.Melee : AttackType.Ranged;
}

function toggleMouseMovement(active: boolean): void {
  if (!scene) return;
  // always clear existing listeners as this function can be called multiple times
  scene.input.off('pointerdown');
  scene.input.off('pointerup');
  scene.input.off('pointermove');
  scene.input.off('gameout');
  scene.input.off('gameover');
  if (active) {
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (Installations.isActive) {
        scene.isMoving = true;
        Installations.updateBuildMarkerPosition(pointer);
      } else {
        // if (GlobalState.GAME.state.gameConfig.enableRangedCharge) {
        // In case of mouse event too soon in the game loading
        const playerObject = scene[Players.selectedPlayer.id];
        if (!playerObject) return;
        const pointerWorld = {
          x: pointer.worldX,
          y: pointer.worldY,
        };
        updateChargingAnim(pointerWorld);
        // }
        // playerObject.aimingDirection = normalizeVector(subtractVectors(pointerWorld, playerObject));
      }
    });

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
      if (scene[Players.selectedPlayer.id]?.isDead) return;
      const { combatControls } = GlobalState.SETTINGS.state;
      if (keyboardCharging && combatControls === 'arcade') return;
      blurAll();
      scene.rightClicked = pointer.rightButtonDown() || (isAlternativeAttack && pointer.leftButtonDown());
      if (!gameObjects.length) void Installations.resetStates();

      const buttonObject: Phaser.GameObjects.GameObject = gameObjects[0];
      if (gameObjects.length && buttonObject && buttonObject.name === 'e_interact') {
        if (scene.activeDeposit && scene.currentAlchemica && scene.currentDepositId !== undefined) {
          updateWithdrawDialog(
            { withdrawDialogState: true, alchemica: scene.currentAlchemica, depositId: scene.currentDepositId },
            GlobalState.UI.dispatch,
          );
        }
      } else if (!gameObjects.length && combatControls === 'arcade' && !Installations.buildModeState) {
        if (!scene?.mapConfig?.SHOOT_MODE && !shootMode) return;
        const playerObject = scene[Players.selectedPlayer.id];

        const hand = scene.rightClicked ? Hand.Right : Hand.Left;
        const attackType = getAttackType(hand);
        const chargeType = attackType === AttackType.Melee ? 'isMeleeCharging' : 'isMissileCharging';
        if (attackType === AttackType.Melee) {
          scene.meleeChargeStartTimestamp = Date.now();
        } else {
          scene.rangedChargeStartTimestamp = Date.now();
        }

        playerObject.setData(chargeType, true);
        mouseCharging = true;
        triggerChargeVfx(attackType);

        if (combatControls === 'arcade' && !GlobalState.GAME.state.gameConfig.enableRangedCharge && attackType === AttackType.Ranged) {
          handleClickAttack(pointer, AttackType.Ranged, hand);
          if (scene.continuousFireInterval) clearInterval(scene.continuousFireInterval);
          scene.continuousFireInterval = window.setInterval(() => handleClickAttack(pointer, AttackType.Ranged, hand), 100);
        }
      } else if (!gameObjects.length && !Installations.buildModeState && combatControls === 'moba') {
        if (scene.rightClicked) {
          toggleSprint(true);
        }
        Players.handleClickToMove(pointer);
      }
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
      const playerObject = scene[Players.selectedPlayer.id];
      if (playerObject?.isDead) {
        playerObject?.chargedContainer?.destroy();
        return;
      }
      const { combatControls } = GlobalState.SETTINGS.state;
      if (combatControls === 'arcade' && keyboardCharging) return;

      if (Installations.isActive) {
        scene.isMoving = true;
        Installations.placeInstallation();
        return;
      }
      scene.isMoving = false;
      if (combatControls === 'moba') {
        if (scene.rightClicked) {
          toggleSprint(false);
        }
        Players.handleClickToMove(pointer);
      } else if (combatControls === 'arcade' && !Installations.buildModeState) {
        if (!scene?.mapConfig?.SHOOT_MODE && !shootMode) return;
        const hand = scene.rightClicked ? Hand.Right : Hand.Left;
        const attackType = getAttackType(hand);
        const chargeType = attackType === AttackType.Melee ? 'isMeleeCharging' : 'isMissileCharging';
        playerObject.setData(chargeType, false);
        playerObject?.chargedContainer?.destroy();
        mouseCharging = false;
        handleClickAttack(pointer, attackType, hand);
      }
      if (scene.continuousFireInterval) clearInterval(scene.continuousFireInterval);
    });

    // ? out of game window
    scene.input.on('gameout', (time: number) => {
      scene[Players.selectedPlayer.id]?.chargedContainer?.destroy();
      scene.isCursorInGame = false;
      setTimeout(() => {
        resetKeyDownsData();
        const data: MouseActiveData = { active: false };
        GameController.sendData('movement', 'mouse', data);
      }, 300);
    });

    // in game window
    scene.input.on('gameover', (time: number) => {
      scene.isCursorInGame = true;
    });
  }
}

// for ranged and melee charge attack animation
const handleChargedRangedAnim = (attackType: 'ranged' | 'melee', pointerWorld: Vector2) => {
  const player = scene[Players.selectedPlayer.id];
  const isSnipe = player.getData('isMissileCharging');
  const isRush = player.getData('isMeleeCharging');
  if (scene[Players.selectedPlayer.id].isGracePeriod) return;
  // if (GameController.MAP !== 'aarena') return;
  if (!player) return;

  if (isSnipe || isRush) {
    const angle = getAngleByDirV2(subtractVectors(pointerWorld, player));
    const direction = normalizeVector(subtractVectors(pointerWorld, player));

    scene[Players.selectedPlayer.id].chargedContainer = scene.add.container(player.x, player.y).setName('chargedContainer');
    scene[Players.selectedPlayer.id].chargedContainer.setDepth(199);
    const tail = scene.add.image(direction.x, direction.y, `charge_${attackType}_tail`).setOrigin(0.5).setScale(2, 0).setName('tail');

    tail.setAngle(-90 + angle);
    scene[Players.selectedPlayer.id].chargedContainer.add(tail);

    const duration =
      (isRush ? GlobalState.GAME.state.gameConfig.maxRushChargeDuration : GlobalState.GAME.state.gameConfig.maxSnipeChargeDuration / 2) * 1000;
    const scaleY =
      (isRush
        ? GlobalState.GAME.state.gameConfig.maxRushDistance * GOTCHI_SIZE.UNIT
        : GlobalState.GAME.state.gameConfig.missileDistance * 1.5 * GOTCHI_SIZE.UNIT) / tail.height; // devide scaling by image size/2 to get a true distance

    // tween for tail
    scene.tweens.add({
      targets: [tail],
      scaleY,
      delay: 0,
      duration,
      ease: Phaser.Math.Easing.Linear,
      onStart: (tween, target) => {
        // console.log('onStart', tween);
        SFXController.playFX('charge');
      },
    });
  }
};

const updateChargingAnim = (pointerWorld: Vector2) => {
  const player = scene[Players.selectedPlayer.id];
  if (!player) return;
  if (scene[Players.selectedPlayer.id].chargedContainer) {
    const tail = scene[Players.selectedPlayer.id].chargedContainer.getByName('tail');
    const angle = getAngleByDirV2(subtractVectors(pointerWorld, player));
    // console.log(`angle ${angle}}`);
    tail?.setAngle(-90 + angle);
  }
};

function resetKeyDownsData() {
  _.forIn(keyDownsData, (value, key) => {
    keyDownsData[key].isPressed = false;
    keyDownsData[key].pressSequence = 0;
  });
}

function toggleSprint(flag: boolean) {
  scene.isSprint = flag;
  const action = flag ? 'start' : 'stop';
  GameController.sendData('movement', 'toggle_sprint', { action });
}

function handleSprint() {
  if (!scene) return;
  scene.cursorKeys.shift.on('down', () => {
    toggleSprint(true);
  });

  scene.cursorKeys.shift.on('up', () => {
    toggleSprint(false);
  });
}

function recordAlternativeAttack() {
  if (!scene) return;
  scene.combatKeys.space.on('down', () => {
    isAlternativeAttack = true;
  });

  scene.combatKeys.space.on('up', () => {
    isAlternativeAttack = false;
  });
}

function handleToggleDebug() {
  if (!scene) return;
  scene.actionKeys.F3.on('down', () => {
    toggleDebug = !toggleDebug;
    GlobalState.PHASER.dispatch({
      type: 'TOGGLE_DEBUG_CONSOLE',
      toggleDebugConsole: toggleDebug,
    });
  });
}

function updateDisableKeyboard(value: boolean, includeMouseMovement?: boolean) {
  if (!scene) return;
  scene.disableKeyboard = value;
  if (includeMouseMovement) toggleMouseMovement(!value);

  // sanity check
  scene.isMoving = false;
  Players.updateServerDirection(Direction.NONE, scene.isSprint);
}

function updateChatBarToggle(value: boolean) {
  scene.toggleChatBar = value;
}

function updateChatToggle(value: boolean) {
  scene.toggleChat = value;
}

function handleExitBuildMode() {
  if (!scene) return;
  scene.actionKeys.Esc.on('down', async () => {
    if (scene.buildInstallation) {
      Installations.toggleBrush();
      setActiveBrush(undefined, GlobalState.USER.dispatch);
    } else if (Installations.buildModeState || GlobalState.UI?.state?.hud === 'BUILD') {
      void Installations.toggleBuildMode(false);
      SFXController.playFX('click');
    }
  });
}

function handleToggleMinimap() {
  if (scene) {
    scene.actionKeys.M.on('down', () => {
      if (!scene.disableKeyboard) {
        scene.toggleMinimap = !scene.toggleMinimap;
        GlobalState.PHASER.dispatch({
          type: 'TOGGLE_MINIMAP',
          toggleMinimap: scene.toggleMinimap,
        });
      }
    });
  }
}

function handleToggleBubbleChat() {
  if (!scene) return;
  scene.toggleChatBar = true;
  scene.actionKeys.B.on('down', (e) => {
    const isWindows = scene?.sys?.game.device.os.windows;
    if ((isWindows && e.ctrlKey && e.altKey) || (!isWindows && e.metaKey && e.altKey)) {
      e.originalEvent.preventDefault();
      scene.toggleChatBar = !scene.toggleChatBar;
      GlobalState.PHASER.dispatch({
        type: 'TOGGLE_CHATBAR',
        toggleChatBar: scene.toggleChatBar,
      });
    }
  });
}

function handleToggleChat() {
  if (!scene) return;
  scene.toggleChat = false;
  scene.actionKeys.T.on('down', (e) => {
    const isWindows = scene.sys.game.device.os.windows;
    if ((isWindows && e.ctrlKey && e.altKey) || (!isWindows && e.metaKey && e.altKey)) {
      e.originalEvent.preventDefault();
      scene.toggleChat = !scene.toggleChat;
      GlobalState.PHASER.dispatch({
        type: 'TOGGLE_CHAT',
        toggleChat: scene.toggleChat,
      });
    }
  });
}

function isSprinting(): boolean {
  return scene.isSprint;
}

function updateShootMode(scheme?: 'PVE' | 'PVP'): void {
  shootMode = scheme;
}

const InputController: inputControllerInterface = {
  init,
  handleKeyboardMovement,
  toggleMouseMovement,
  updateDisableKeyboard,
  updateChatBarToggle,
  updateChatToggle,
  isSprinting,
  updateShootMode,
};

export default InputController;
