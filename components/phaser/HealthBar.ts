import { scene } from 'components/controllers/SceneController';
import Phaser from 'phaser';
export interface HealthBarType extends Phaser.GameObjects.Graphics {
  bar: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  value: number;
  percentage: number;
  getDamage: (amount: number) => void;
  getCurrentHealth: () => number;
  draw: () => void;
}

export default class HealthBar extends Phaser.GameObjects.Graphics {
  bar: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  value: number;
  percentage: number;
  type: 'player' | 'friends' | 'enemy';
  maxHP: number;
  // eslint-disable-next-line @typescript-eslint/ban-types
  enemyConfig: {};

  constructor(x: number, y: number, type: 'player' | 'friends' | 'enemy', max?: number) {
    super(scene);
    this.bar = this;
    this.x = x;
    this.y = y;
    const maxHp = Number(max);
    this.maxHP = Number.isFinite(maxHp) && maxHp > 0 ? maxHp : 1000;
    this.value = this.maxHP;
    this.percentage = 1;
    this.type = type;

    this.enemyConfig = {
      100: {
        outlineColor: 0x0b4f00,
        fillColor: 0xf6b203,
      },
      70: {
        outlineColor: 0x4f4700,
        fillColor: 0xec6113,
      },
      40: {
        outlineColor: 0x8c2121,
        fillColor: 0xfb2f02,
      },
      20: {
        outlineColor: 0xb20202,
        fillColor: 0xdd2c26,
      },
    };

    this.draw();
  }

  /** `amount` is remaining HP (not damage dealt). Optional max refreshes bar scale. */
  getDamage(amount: number, max?: number) {
    if (Number.isFinite(Number(max)) && Number(max) > 0) {
      this.maxHP = Number(max);
    }
    const next = Number(amount);
    this.value = Number.isFinite(next) ? Math.max(0, next) : 0;

    this.draw();
    return this.value === 0;
  }

  draw() {
    this.bar.clear();
    const maxHp = this.maxHP > 0 ? this.maxHP : 1000;
    const ratio = Math.max(0, Math.min(1, this.value / maxHp));

    if (this.type === 'player' || this.type === 'friends') {
      // background (grey track is intentional)
      this.bar.fillStyle(this.type === 'player' ? 0xa3a3a3 : 0x686984);
      this.bar.fillRoundedRect(this.x, this.y, 70, 16, 2);
      // border
      this.bar.lineStyle(2, this.type === 'player' ? 0x000000 : 0x3a3b56, 1);
      this.bar.strokeRoundedRect(this.x, this.y, 70, 16, 2);
      // health fill — magenta for local player, purple for others
      this.bar.fillStyle(this.type === 'player' ? 0xff38ff : 0xc000b7);

      const d = Math.floor(66 * ratio);
      if (d > 0) {
        this.bar.fillRoundedRect(this.x + 2, this.y + 2, d, 12, 2);
      }
    }

    if (this.type === 'enemy') {
      this.bar.fillStyle(0xa3a3a3, 0.5);
      this.bar.fillRoundedRect(this.x, this.y, 240, 20, 2);
      this.bar.fillStyle(0xff0000, 1);

      const d = Math.floor(238 * ratio);
      if (d > 0) {
        this.bar.fillRoundedRect(this.x + 1, this.y, d, 20, 2);
      }
    }
  }

  getCurrentHealth() {
    return this.value;
  }
}
