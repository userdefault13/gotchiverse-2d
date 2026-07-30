import GlobalState from 'contexts/GlobalState';
import { scene } from 'components/controllers/SceneController';
import _ from 'lodash';
import { AnimationConfig, SceneType } from 'types';
import { AnimConfig, SoundConfig, TextureConfig } from 'types/phaser';
import SFXController from './SFXController';
import tilesJson from 'shared_code/data/tiles.json';
import { getStaticAssetPrefix } from 'helpers/realm.helper';
import GameController from './GameController';
import { GAME_CONFIG } from 'shared_code/constants/const.game';

const staticAssetPrefix = getStaticAssetPrefix();
// available types list
// FUD=0 FOMO=1 ALPHA=2 KEK=3
// ['decorations', 'installations', 'spritesheets', 'images', 'paartner'];

// TEXTURES
const uiList: TextureConfig[] = [
  { id: 'equipBtn', preload: true },
  { id: 'closeBtn', preload: true },
  { id: 'removeBtn', preload: true },
  { id: 'upgradeBtn', preload: true },
  { id: 'moveBtn', preload: true },
  { id: 'upgradeBtnIcon', preload: true },
  { id: 'xBtn', preload: true },
  { id: 'minimap', preload: true },
  { id: 'minimap_v2_playable', preload: true },
  { id: 'minimap_v2_halloween', preload: true },
  { id: 'minimap-gotchi', preload: true, map: 'aarena' },
  { id: 'minimap_obs_blue', preload: true, map: 'aarena' },
  { id: 'minimap_obs_green', preload: true, map: 'aarena' },
  { id: 'minimap_obs_orange', preload: true, map: 'aarena' },
  { id: 'minimap_obs_pink', preload: true, map: 'aarena' },
  { id: 'minimap_obs_purple', preload: true, map: 'aarena' },
  { id: 'minimap_obs_red', preload: true, map: 'aarena' },
  { id: 'minimap_obs_yellow', preload: true, map: 'aarena' },
  { id: 'minimap_aarena_icon', preload: true, map: 'aarena' },
  { id: 'minimap-potion', preload: true, map: 'aarena' },

  { id: 'icon_vortex', preload: true },
];

const mapImageList: TextureConfig[] = [
  { id: 'tower1', preload: true },
  { id: 'tower2', preload: true },
  { id: 'tower3', preload: true },
  { id: 'tower4', preload: true },
  // { id: 'lights', preload: true },
  { id: 'unplayable', preload: true },
  { id: 'gate_north', preload: true },
  { id: 'gate_south', preload: true },
  { id: 'gate_west', preload: true },
  { id: 'gate_east', preload: true },
  { id: 'alchem', preload: true },
  { id: 'roads', preload: true, map: 'aarena' },
  { id: 'alchem_new', preload: true, map: 'aarena' },
  { id: 'alchem_glow', preload: true },
  { id: 'statue_prince', preload: true },
  // { id: 'parcels', preload: true },
  { id: 'statues', preload: true },
];
const aarenaMapImageList: TextureConfig[] = [
  { id: 'aarena01_static1', preload: true, map: 'aarena' },
  { id: 'aarena01_4x_minimap', preload: true, map: 'aarena' },
];

const aarenMapSpriteList: TextureConfig[] = [
  { id: 'aarena01_cauldron_big', preload: true, map: 'aarena', animationConfig: { isLoop: true, hide: false } },
  { id: 'aarena01_cauldron_smol', preload: true, map: 'aarena', animationConfig: { isLoop: true, hide: false } },
  { id: 'aarena01_glow', preload: true, map: 'aarena', animationConfig: { isLoop: true, hide: false } },
  { id: 'fire_sparks_big', preload: true, map: 'aarena', animationConfig: { isLoop: true, hide: false } },
  { id: 'fire_splash_big', preload: true, map: 'aarena', animationConfig: { isLoop: true, hide: false } },
  { id: 'fire_splash', preload: true, map: 'aarena', animationConfig: { isLoop: true, hide: false } },
];

const defaultImages: TextureConfig[] = [
  { id: 'e_interact', preload: true },
  { id: 'vortex_glow', preload: true },
  { id: '6_0_bot_shadow', preload: true },
  { id: 'turkey_shell', preload: true, map: 'aarena' },
  { id: 'move-arrow', preload: true, map: 'aarena' },
  { id: 'gotchi_shadow', preload: true, map: 'aarena' },
  { id: 'bubble_tl', preload: true, map: 'aarena' },
  { id: 'bubble_top', preload: true, map: 'aarena' },
  { id: 'bubble_tr', preload: true, map: 'aarena' },
  { id: 'bubble_left', preload: true, map: 'aarena' },
  { id: 'bubble_middle', preload: true, map: 'aarena' },
  { id: 'bubble_right', preload: true, map: 'aarena' },
  { id: 'bubble_bl', preload: true, map: 'aarena' },
  { id: 'bubble_bottom', preload: true, map: 'aarena' },
  { id: 'bubble_br', preload: true, map: 'aarena' },
  { id: 'bubble_tail', preload: true, map: 'aarena' },
  { id: 'charge_melee_tail', preload: true, map: 'aarena' },
  { id: 'charge_ranged_tail', preload: true, map: 'aarena' },
  { id: 'sacred_root_base_bottom', preload: true },
  { id: 'sacred_root_base', preload: true },
];

const paartnerList: TextureConfig[] = [
  { id: 'ygg', preload: true },
  { id: 'blackpool', preload: true },
  { id: 'neon', preload: true },
  { id: 'ordengg', preload: true },
  { id: 'flamingo', preload: true },
  { id: 'cgu', preload: true },
  { id: 'readyplayerdao', preload: true },
  { id: 'metaguild', preload: true },
  { id: 'yggsea', preload: true },
  { id: 'metaguild_halloween', preload: true },
];

// ANIMATIONS
const decorationsList: TextureConfig[] = [
  { id: 'Caamp_Fire', preload: true },
  { id: 'Smol_Flower', preload: true },
  { id: 'REALM_Globe', preload: true },
  { id: 'Laava_Lamp', preload: true },
  { id: 'GM_Light', preload: true },
  { id: 'Rofl_Gnome', preload: true },
  { id: 'Graand_Fountain', preload: true, animationConfig: { isLoop: true } },
  { id: 'paampkin_trio', preload: true, animationConfig: { isLoop: true } },
  { id: 'roflkin', preload: true, animationConfig: { isLoop: true } },
  { id: 'scareye_crow', preload: true, animationConfig: { isLoop: true } },
  { id: 'gotchi_caandle', preload: true, animationConfig: { isLoop: true } },
  { id: 'sus_baatterfly', preload: true, animationConfig: { isLoop: true } },
  { id: 'skeledator', preload: true, animationConfig: { isLoop: true } },

  // Xmass
  { id: 'aangel_tree', preload: true, animationConfig: { isLoop: true } },
  { id: 'brrrooorrr', preload: true, animationConfig: { isLoop: true } },
  { id: 'bulby', preload: true, animationConfig: { isLoop: true } },
  { id: 'feelin_lit', preload: true, animationConfig: { isLoop: true } },
  { id: 'rednosed_rofl', preload: true, animationConfig: { isLoop: true } },
];

const nftDefaultImage: TextureConfig[] = [
  { id: '137_default', preload: true },
  { id: '138_default', preload: true },
  { id: '139_default', preload: true },
  { id: '140_default', preload: true },
  { id: '141_default', preload: true },
  { id: '142_default', preload: true },
  { id: '143_default', preload: true },
  { id: '144_default', preload: true },
  { id: '157_default', preload: true },
  { id: '158_default', preload: true },
  { id: '159_default', preload: true },
  { id: '160_default', preload: true },
  { id: '161_default', preload: true },
];

const nftFilterList: TextureConfig[] = [
  { id: 'filter_4x4', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'filter_4x6', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'filter_6x4', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'filter_8x8', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'filter_8x12', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'filter_12x8', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'filter_12x12', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'filter_16x16', preload: true, animationConfig: { isLoop: true, hide: false } },
];

const installationList: TextureConfig[] = [
  { id: '0-LE_0', preload: true },
  { id: '0_0', preload: true },
  { id: '1_0', preload: true },
  { id: '1_1', preload: true },
  { id: '1_2', preload: true },
  { id: '1_3', preload: true },
  { id: '2_0', preload: true },
  { id: '2_1', preload: true },
  { id: '2_2', preload: true },
  { id: '2_3', preload: true },
  { id: '6_0', preload: true },
  { id: '137', preload: true },
  { id: '138', preload: true },
  { id: '139', preload: true },
  { id: '140', preload: true },
  { id: '141', preload: true },
  { id: '142', preload: true },
  { id: '143', preload: true },
  { id: '144', preload: true },
  { id: '145', preload: true },
  // Soft-launch sheets live in this app's /public — not on verse-static CDN.
  { id: 'store', preload: true, local: true },
  { id: 'cashier', preload: true, local: true },
  { id: 'shelf', preload: true, local: true },
  { id: 'terminal', preload: true, local: true },
  { id: 'console', preload: true, local: true },
  { id: '157', preload: true },
  { id: '158', preload: true },
  { id: '159', preload: true },
  { id: '160', preload: true },
  { id: '161', preload: true },
  { id: 'waall', preload: true },
  { id: 'lodge', preload: true },
  { id: 'maaker_door', preload: true },
  { id: 'maaker_bot', preload: true },
  { id: 'equip', preload: true, animationConfig: { isLoop: true } },
  { id: 'unequip', preload: true, animationConfig: { hide: true } },
  { id: 'action_upgrade', preload: true, animationConfig: { isLoop: true } },
  { id: 'land_wip', preload: true, animationConfig: { isLoop: true } },
];

const spriteList: TextureConfig[] = [
  { id: 'chat', preload: true, map: 'aarena' },
  { id: 'alchemica_x3', preload: true, map: 'aarena' },
  { id: 'alchemica_candy_x3', preload: true },
  { id: 'pickup', preload: true, map: 'aarena', animationConfig: { hide: true } },
  // { id: 'shoot_muzzle', preload: true, animationConfig: { hide: true } },
  { id: 'impact_heart', map: 'aarena', preload: true, animationConfig: { hide: true } },
  { id: 'alchemica_deposit', preload: true, animationConfig: { hide: true } },
  { id: 'flame', preload: true },
  { id: 'observer_body', preload: true, map: 'aarena' },
  { id: 'observer_iris', preload: true, map: 'aarena' },
  { id: 'pumpkin_idle_hit', preload: true, map: 'aarena' },
  { id: 'pumpkin_destroy', preload: true, map: 'aarena', animationConfig: { isLoop: false, hide: true } },
  { id: 'pumpkin_spawn', preload: true, map: 'aarena', animationConfig: { isLoop: false, hide: true } },
  { id: 'deposit_crystal', preload: true, map: 'aarena', animationConfig: { isLoop: true } },
  { id: 'deposit_vortex', preload: true, map: 'aarena', animationConfig: { isLoop: true } },
  // turkey
  { id: 'turkey_spawn', preload: true, map: 'aarena', animationConfig: { isLoop: false, hide: true, duration: 300 } },
  { id: 'turkey_destroy_fade', preload: true, map: 'aarena' },
  { id: 'turkey_idle_hit', preload: true, map: 'aarena' },

  { id: 'deposit_crystal', preload: true, animationConfig: { isLoop: true } },
  { id: 'deposit_vortex', preload: true, animationConfig: { isLoop: true } },
  // { id: 'impact_poof', preload: true, animationConfig: { hide: true, isLoop: false } },
  // { id: 'shoot_heart', preload: true, animationConfig: { isLoop: true, hide: false } },
  // { id: 'shoot_skull', preload: true, animationConfig: { isLoop: true, hide: false } },
  // { id: 'shoot_bone', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'death', map: 'aarena', preload: true, animationConfig: { hide: true, isLoop: false } },
  { id: 'gotchi_spawn', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'spillover', preload: true, map: 'aarena', animationConfig: { isLoop: false, hide: true } },
  { id: 'sprint', map: 'aarena', preload: true, animationConfig: { isLoop: true, hide: false } },

  // { id: 'shoot_pie', preload: true, animationConfig: { isLoop: true, hide: true } },
  // { id: 'impact_splat', preload: true, animationConfig: { isLoop: false, hide: true } },

  { id: 'aarena01_ext_bg', preload: true, map: 'aarena' },
  { id: 'aarena01_ext_back', preload: true, map: 'aarena' },
  { id: 'aarena01_ext_north', preload: true, map: 'aarena', animationConfig: { isLoop: true, hide: false } },
  { id: 'aarena01_ext_south', preload: true, map: 'aarena', animationConfig: { isLoop: false, hide: false } },
  { id: 'aarena01_ext_overlay', preload: true, map: 'aarena' },
  // potion drink
  { id: 'potion_drink_ALPHA', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'potion_drink_FOMO', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'potion_drink_FUD', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'potion_drink_GLTR', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'potion_drink_KEK', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: true } },
  // potion spawn
  { id: 'potion_spawn_ALPHA', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: false } },
  { id: 'potion_spawn_FOMO', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: false } },
  { id: 'potion_spawn_FUD', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: false } },
  { id: 'potion_spawn_GLTR', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: false } },
  { id: 'potion_spawn_KEK', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: false } },
  { id: 'GMLS_pickup', map: 'aarena', preload: true, animationConfig: { isLoop: true, hide: false } },

  { id: 'potion_collect', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: true } },
  // quests
  { id: 'poof', preload: true, map: 'aarena', animationConfig: { isLoop: false, hide: true } },
  // { id: 'vfx_magic', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'sacred_root_magic', preload: true, animationConfig: { isLoop: true, hide: true } },
  { id: 'sacred_root_idle_reveal', preload: true },
  { id: 'sacred_root_verses', preload: true },
  // GMLS vfx
  { id: 'GMLS_destroy', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'GMLS_head', preload: true, map: 'aarena' },
  { id: 'GMLS_idle_vfx', map: 'aarena', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'GMLS_imp', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'GMLS_main', map: 'aarena', preload: true },
  { id: 'GMLS_shot_muz', map: 'aarena', preload: true },
  { id: 'GMLS_shot', map: 'aarena', preload: true, animationConfig: { isLoop: true, hide: false } },

  // PLM2
  { id: 'PLM2_main', map: 'aarena', preload: true },
  { id: 'PLM2_head', preload: true, map: 'aarena' },
  { id: 'PLM2_destroy', map: 'aarena', preload: true, animationConfig: { isLoop: false, hide: true } },

  // minimap Anim
  { id: 'minimap_roots', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'minimap_GMLS', map: 'aarena', preload: true, animationConfig: { isLoop: true, hide: false } },
  { id: 'minimap_PLM2', map: 'aarena', preload: true, animationConfig: { isLoop: true, hide: false } },

  // WL Rofl
  { id: 'woodland_rofl', map: 'aarena', preload: true },
];

const combatList: TextureConfig[] = [
  // MELEE
  // Slap
  { id: 'slap_air', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'slap_bas', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'slap_dud', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'slap_imp', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'slap_muz', preload: true, animationConfig: { isLoop: false, hide: true } },

  // Rush
  { id: 'rush_air', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'rush_bas', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'rush_dud', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'rush_emi', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'rush_imp', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'rush_muz', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'rush_tra', preload: true, animationConfig: { isLoop: false, hide: true } },

  // MISSILE
  // Shot
  { id: 'shot_air', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'shot_bas', preload: true, animationConfig: { isLoop: true, hide: true } },
  { id: 'shot_dud', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'shot_emi', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'shot_imp', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'shot_muz', preload: true, animationConfig: { isLoop: false, hide: true } },

  // Sprint
  { id: 'spri_muz', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'evade', preload: true, animationConfig: { isLoop: false, hide: true } },

  // Snipe
  { id: 'snip_bas', preload: true, animationConfig: { isLoop: true, hide: true } },
  { id: 'snip_muz', preload: true, animationConfig: { isLoop: false, hide: true } },
  { id: 'snip_emi', preload: true, animationConfig: { isLoop: false, hide: true } },
];

// Individual Animations  linked to one json file
const animationList: TextureConfig[] = [
  // installationss
  { id: 'equip_start', animationConfig: { configKey: 'equip', slice: [0, 12], isLoop: false, hide: false } },
  { id: 'equip_end', animationConfig: { configKey: 'equip', slice: [12], isLoop: false, hide: true } },
  // pumpkin
  { id: 'pumpkin_idle', animationConfig: { configKey: 'pumpkin_idle_hit', slice: [7], isLoop: true, hide: false } },
  { id: 'pumpkin_hit', animationConfig: { configKey: 'pumpkin_idle_hit', slice: [0, 7], isLoop: false, hide: false } },
  // turkey
  { id: 'turkey_destroy', animationConfig: { configKey: 'turkey_destroy_fade', slice: [0, 25], isLoop: false, hide: false, duration: 300 } },
  { id: 'turkey_fade', animationConfig: { configKey: 'turkey_destroy_fade', slice: [25], isLoop: true, hide: false, duration: 300 } },
  { id: 'turkey_hit', animationConfig: { configKey: 'turkey_idle_hit', slice: [0, 23], isLoop: false, hide: false, duration: 300 } },
  { id: 'turkey_idle', animationConfig: { configKey: 'turkey_idle_hit', slice: [23, 37], isLoop: true, hide: false, duration: 300 } },
  { id: 'turkey_run', animationConfig: { configKey: 'turkey_idle_hit', slice: [37], isLoop: true, hide: false, duration: 300 } },
  // maaker_bot animations
  { id: 'maaker_bot_fix', animationConfig: { configKey: 'maaker_bot', slice: [0, 11], isLoop: true, hide: false } },
  { id: 'maaker_bot_fly', animationConfig: { configKey: 'maaker_bot', slice: [12, 23], isLoop: true, hide: false } },
  { id: 'maaker_bot_idle', animationConfig: { configKey: 'maaker_bot', slice: [23, 32], isLoop: true, hide: false } },
  { id: 'maaker_bot_forward', animationConfig: { configKey: 'maaker_bot', slice: [33, 48], isLoop: false, hide: false } },
  { id: 'maaker_bot_backward', animationConfig: { configKey: 'maaker_bot', slice: [48], isLoop: false, hide: false } },
  // maaker_door_animations
  { id: 'maaker_door_open', animationConfig: { configKey: 'maaker_bot', slice: [0, 33] } },
  { id: 'maaker_door_close', animationConfig: { configKey: 'maaker_bot', slice: [33] } },
  // sacred root
  { id: 'root_idle', animationConfig: { configKey: 'sacred_root_idle_reveal', slice: [0, 30], isLoop: true, hide: false, duration: 300 } },
  { id: 'root_reveal', animationConfig: { configKey: 'sacred_root_idle_reveal', slice: [30, 66], isLoop: false, hide: false, duration: 500 } },
  { id: 'root_post', animationConfig: { configKey: 'sacred_root_idle_reveal', slice: [66, 67], isLoop: true, hide: false, duration: 300 } },
  { id: 'root_empty', animationConfig: { configKey: 'sacred_root_idle_reveal', slice: [67], isLoop: true, hide: false, duration: 300 } },
  // ? GMLS enemy
  { id: 'GMLS_head_empty', animationConfig: { configKey: 'GMLS_head', slice: [1, 20], isLoop: false, hide: false, duration: 300 } },
  { id: 'GMLS_head_fill', animationConfig: { configKey: 'GMLS_head', slice: [20, 40], isLoop: false, hide: false, duration: 300 } },

  { id: 'GMLS_transition', animationConfig: { configKey: 'GMLS_main', slice: [0, 10], isLoop: false, hide: false, duration: 300 } },
  { id: 'GMLS_idle', animationConfig: { configKey: 'GMLS_main', slice: [10, 22], isLoop: true, hide: false, duration: 300 } },
  { id: 'GMLS_spawn', animationConfig: { configKey: 'GMLS_main', slice: [22, 53], isLoop: false, hide: false, duration: 300 } },

  { id: 'GMLS_run_up', animationConfig: { configKey: 'GMLS_main', slice: [53, 68], isLoop: true, hide: false, duration: 300 } },
  { id: 'GMLS_run_right', animationConfig: { configKey: 'GMLS_main', slice: [68, 83], isLoop: true, hide: false, duration: 300 } },
  { id: 'GMLS_run_down', animationConfig: { configKey: 'GMLS_main', slice: [83, 98], isLoop: true, hide: false, duration: 300 } },
  { id: 'GMLS_run_left', animationConfig: { configKey: 'GMLS_main', frameId: 93, isLoop: true, hide: false, duration: 300 } },

  { id: 'GMLS_shot_muz_down', animationConfig: { configKey: 'GMLS_shot_muz', slice: [0, 10], isLoop: false, hide: true, duration: 300 } },
  { id: 'GMLS_shot_muz_left', animationConfig: { configKey: 'GMLS_shot_muz', slice: [10, 20], isLoop: false, hide: true, duration: 300 } },
  { id: 'GMLS_shot_muz_up', animationConfig: { configKey: 'GMLS_shot_muz', slice: [20, 30], isLoop: false, hide: true, duration: 300 } },
  { id: 'GMLS_shot_muz_right', animationConfig: { configKey: 'GMLS_shot_muz', slice: [30], isLoop: false, hide: true, duration: 300 } },

  // PLM2
  { id: 'PLM2_transition', animationConfig: { configKey: 'PLM2_main', slice: [0, 10], isLoop: false, hide: false, duration: 300 } },
  { id: 'PLM2_idle', animationConfig: { configKey: 'PLM2_main', slice: [10, 22], isLoop: true, hide: false, duration: 300 } },
  { id: 'PLM2_spawn', animationConfig: { configKey: 'PLM2_main', slice: [22, 53], isLoop: false, hide: false, duration: 300 } },

  { id: 'PLM2_run_up', animationConfig: { configKey: 'PLM2_main', slice: [53, 68], isLoop: true, hide: false, duration: 300 } },
  { id: 'PLM2_run_right', animationConfig: { configKey: 'PLM2_main', slice: [68, 83], isLoop: true, hide: false, duration: 300 } },
  { id: 'PLM2_run_down', animationConfig: { configKey: 'PLM2_main', slice: [83, 98], isLoop: true, hide: false, duration: 300 } },
  { id: 'PLM2_run_left', animationConfig: { configKey: 'PLM2_main', slice: [98], isLoop: true, hide: false, duration: 300 } },

  // WL Rofl
  { id: 'ROFL_idle', animationConfig: { configKey: 'woodland_rofl', index: 0, isLoop: true, hide: false } },
  { id: 'ROFL_run_up', animationConfig: { configKey: 'woodland_rofl', index: 1, isLoop: true, hide: false } },
  { id: 'ROFL_run_right', animationConfig: { configKey: 'woodland_rofl', index: 2, isLoop: true, hide: false } },
  { id: 'ROFL_run_down', animationConfig: { configKey: 'woodland_rofl', index: 3, isLoop: true, hide: false } },
  { id: 'ROFL_run_left', animationConfig: { configKey: 'woodland_rofl', index: 4, isLoop: true, hide: false } },

  { id: 'ROFL_eat_up', animationConfig: { configKey: 'woodland_rofl', index: 5, isLoop: false, hide: false } },
  { id: 'ROFL_eat_right', animationConfig: { configKey: 'woodland_rofl', index: 6, isLoop: false, hide: false } },
  { id: 'ROFL_eat_down', animationConfig: { configKey: 'woodland_rofl', index: 7, isLoop: false, hide: false } },
  { id: 'ROFL_eat_left', animationConfig: { configKey: 'woodland_rofl', index: 8, isLoop: false, hide: false } },

  { id: 'ROFL_spot_up', animationConfig: { configKey: 'woodland_rofl', index: 9, isLoop: false, hide: false } },
  { id: 'ROFL_spot_right', animationConfig: { configKey: 'woodland_rofl', index: 10, isLoop: false, hide: false } },
  { id: 'ROFL_spot_down', animationConfig: { configKey: 'woodland_rofl', index: 11, isLoop: false, hide: false } },
  { id: 'ROFL_spot_left', animationConfig: { configKey: 'woodland_rofl', index: 12, isLoop: false, hide: false } },

  { id: 'ROFL_burp', animationConfig: { configKey: 'woodland_rofl', index: 13, isLoop: false, hide: false } },
];

const tileList: TextureConfig[] = [];

// SOUNDS
const mp3AudioList: SoundConfig[] = [
  { id: 'send', volume: 0.5, loop: false, preload: true },
  { id: 'check', volume: 0.5, loop: false, preload: true },
  { id: 'sending', volume: 0.5, loop: false, preload: true },
  { id: 'oops', volume: 1, loop: false, preload: true },
  { id: 'statue', volume: 0.3, loop: false },
  { id: 'noshoot', volume: 1, loop: false },
  { id: 'theme_citaadel', type: 'MUSIC', volume: 0.4, loop: true },
  { id: 'alchemica_deposited', volume: 0.4, loop: false },
];

const oggAudioList: SoundConfig[] = [
  // Gotchi
  { id: 'click', volume: 0.5, loop: false, preload: true },
  { id: 'gotchi_spawn', volume: 0.3, loop: false, preload: true },
  { id: 'bump', volume: 0.4, loop: false },
  { id: 'chat_bubble', volume: 0.3, loop: false },
  { id: 'chat_bubble_incoming', volume: 0.3, loop: false },
  { id: 'emote', volume: 0.35, loop: false },

  // Combat
  { id: 'gotchi_hit_hazard_noHitSound', volume: 0.4, loop: false },
  { id: 'gotchi_hit_hazard', volume: 0.4, loop: false },
  { id: 'gotchi_hit_hazardBlock', volume: 0.4, loop: false },
  { id: 'death', volume: 0.4, loop: false },
  { id: 'shoot_heart', volume: 0.4, loop: false },
  { id: 'cannot_attack', volume: 0.4, loop: false },
  { id: 'invalid_attack', volume: 0.4, loop: false },
  { id: 'impact_heart', volume: 0.4, loop: false, spatial: { spatialInnerRange: 320, spatialOuterRange: 1024 } },
  { id: 'charge_shot', volume: 0.4, loop: false },
  { id: 'charge', volume: 0.4, loop: false },
  { id: 'rush_bas', volume: 0.4, loop: false },
  { id: 'rush_dud', volume: 0.4, loop: false },
  { id: 'rush_imp_1', volume: 0.4, loop: false },
  { id: 'rush_imp_2', volume: 0.4, loop: false },
  { id: 'rush_imp_3', volume: 0.4, loop: false },
  { id: 'shot_bas_1', volume: 0.4, loop: false },
  { id: 'shot_bas_2', volume: 0.4, loop: false },
  { id: 'shot_bas_3', volume: 0.4, loop: false },
  { id: 'shot_dud_1', volume: 0.4, loop: false },
  { id: 'shot_dud_2', volume: 0.4, loop: false },
  { id: 'shot_dud_3', volume: 0.4, loop: false },
  { id: 'shot_imp_1', volume: 0.4, loop: false },
  { id: 'shot_imp_2', volume: 0.4, loop: false },
  { id: 'shot_imp_3', volume: 0.4, loop: false },
  { id: 'slap_air', volume: 0.4, loop: false },
  { id: 'slap_bas', volume: 0.4, loop: false },
  { id: 'slap_dud', volume: 0.4, loop: false },
  { id: 'slap_imp_1', volume: 0.4, loop: false },
  { id: 'slap_imp_2', volume: 0.4, loop: false },
  { id: 'slap_imp_3', volume: 0.4, loop: false },
  { id: 'slap_imp_4', volume: 0.4, loop: false },
  { id: 'spri_muz', volume: 0.4, loop: false },
  { id: 'cauldron', volume: 0.4, loop: true },
  { id: 'evade', volume: 0.4, loop: false },

  // Movement/Surfaces
  { id: 'sprint_loop', volume: 0.3, loop: true, preload: true },
  { id: 'sprint_intro', volume: 0.3, loop: false, preload: false },
  { id: 'sprint_outro', volume: 0.3, loop: false, preload: false },
  // { id: 'gotchi_on_road', volume: 0.4, loop: false },
  { id: 'gotchi_road_idle', volume: 0.3, loop: true },
  { id: 'gotchi_road_intro', volume: 0.3, loop: false },
  { id: 'gotchi_road_outro', volume: 0.3, loop: false },
  { id: 'alchemica_alpha', volume: 0.3, loop: true },
  { id: 'alchemica_fomo', volume: 0.3, loop: true },
  { id: 'alchemica_fud', volume: 0.3, loop: true },
  { id: 'alchemica_kek', volume: 0.3, loop: true },

  // Spillover
  { id: 'spillover_spawn_alpha', volume: 0.4, loop: false, preload: false, spatial: { spatialInnerRange: 320, spatialOuterRange: 1024 } },
  { id: 'spillover_spawn_fomo', volume: 0.4, loop: false, preload: false, spatial: { spatialInnerRange: 320, spatialOuterRange: 1024 } },
  { id: 'spillover_spawn_fud', volume: 0.4, loop: false, preload: false, spatial: { spatialInnerRange: 320, spatialOuterRange: 1024 } },
  { id: 'spillover_spawn_kek', volume: 0.4, loop: false, preload: false, spatial: { spatialInnerRange: 320, spatialOuterRange: 1024 } },

  // Pickups
  // { id: 'alchemica_deposited', volume: 0.4, loop: false },
  { id: 'cant_pickup', volume: 0.4, loop: false },
  { id: 'pickup_alpha_sound_small', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pickup_alpha_sound_medium', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pickup_alpha_sound_large', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pickup_fomo_sound_small', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pickup_fomo_sound_medium', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pickup_fomo_sound_large', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pickup_kek_sound_small', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pickup_kek_sound_medium', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pickup_kek_sound_large', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pickup_fud_sound_small', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pickup_fud_sound_medium', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pickup_fud_sound_large', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  // potions
  { id: 'potion_collect', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'potion_drink', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'potion_spawn', volume: 0.4, loop: false, spatial: { spatialInnerRange: 256, spatialOuterRange: 1024 } },
  { id: 'pocket_full', volume: 0.3, loop: false },

  // Installations (id:X_Y where X=installation type: haarvester=1, Y=alchemica: fud,fomo,alpha,kek)
  { id: '1_0', volume: 0.3, preload: true, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } }, // harvester_fud
  { id: '1_1', volume: 0.8, preload: true, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } }, // harvester_fomo
  { id: '1_2', volume: 0.5, preload: true, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } }, // harvester_alpha
  { id: '1_3', volume: 0.6, preload: true, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } }, // harvester_kek
  { id: 'parcel_survey', volume: 0.4, loop: false },
  { id: 'equip_sound', volume: 0.4, loop: false },
  { id: 'unequip_sound', volume: 0.4, loop: false },
  // { id: 'aalter_flame_off', volume: 0.6, loop: false, spatial:{spatialInnerRange: 256, spatialOuterRange: 768} },
  // { id: 'aalter_flame_on', volume: 0.6, loop: false, spatial:{spatialInnerRange: 256, spatialOuterRange: 768} },
  { id: 'channeling_start', volume: 0.4, loop: false },
  { id: 'channeling_end', volume: 0.4, loop: false },
  { id: 'spillover_start', volume: 0.4, loop: false },
  { id: 'maaker_bot', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'maaker_bot_send', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'maaker_bot_receive', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'bounce_gaate', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },

  // NFT Displays
  { id: 'nft_basic_long', volume: 0.15, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'nft_basic_short', volume: 0.15, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'nft_golden_long', volume: 0.15, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'nft_golden_short', volume: 0.15, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },

  // Decorations
  { id: 'fountain', volume: 0.7, loop: true, spatial: { spatialInnerRange: 196, spatialOuterRange: 896 } },

  // Halloween
  { id: 'sus_baatterfly', volume: 0.25, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'gotchi_caandle', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'scareye_crow', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 544 } },
  { id: 'roflkin', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'paampkin_trio', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'skeledator', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },

  // Xmass
  { id: 'aangel_tree', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'brrrooorrr', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'bulby', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'feelin_lit', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'rednosed_rofl', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },

  // Event musics
  { id: 'theme_halloween', type: 'MUSIC', volume: 0.4, loop: true },
  { id: 'theme_turkey', type: 'MUSIC', volume: 0.4, loop: true },
  { id: 'theme_aarena', type: 'MUSIC', volume: 0.4, loop: true },
  { id: 'theme_sacredroot_zane', type: 'MUSIC', volume: 0.4, loop: true, spatial: { spatialInnerRange: 1024, spatialOuterRange: 4096 } },
  { id: 'theme_aarena-exterior_zane', type: 'MUSIC', volume: 0.4, loop: true, spatial: { spatialInnerRange: 1024, spatialOuterRange: 8192 } },

  // AArena
  { id: 'aarena01_ext_open', volume: 0.3, loop: false },
  { id: 'aarena01_ext', volume: 0.3, loop: true, spatial: { spatialInnerRange: 512, spatialOuterRange: 2048 } },

  { id: 'pumpkin_destroy', volume: 0.3, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'pumpkin_hit', volume: 0.3, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'pumpkin_idle', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'pumpkin_spawn', volume: 0.3, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },

  { id: 'impact_splat', volume: 0.3, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  // turkey
  { id: 'turkey_destroy', volume: 0.3, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 800 } },
  { id: 'turkey_fade', volume: 0.3, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 800 } },
  { id: 'turkey_hit', volume: 0.3, loop: false, spatial: { spatialInnerRange: 64, spatialOuterRange: 400 } },
  { id: 'turkey_idle', volume: 0.3, loop: true, spatial: { spatialInnerRange: 32, spatialOuterRange: 600 } },
  { id: 'turkey_run', volume: 0.3, loop: true, spatial: { spatialInnerRange: 64, spatialOuterRange: 1024 } },
  { id: 'turkey_spawn', volume: 0.3, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 900 } },
  // quest (sacred root)
  { id: 'poof', volume: 0.4, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 1024 } },
  { id: 'root_exit', volume: 0.4, loop: false },
  { id: 'root_idle', volume: 0.4, loop: true, spatial: { spatialInnerRange: 512, spatialOuterRange: 1024 } },
  { id: 'root_reveal', volume: 0.4, loop: false },
  { id: 'root_spawn', volume: 0.4, loop: false },
  // GMLS enemy
  { id: 'GMLS_destroy', volume: 0.4, preload: true, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 1024 } },
  { id: 'GMLS_hit', volume: 0.4, preload: true, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'GMLS_idle', volume: 0.4, preload: true, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'GMLS_imp', volume: 0.4, preload: true, loop: false, spatial: { spatialInnerRange: 512, spatialOuterRange: 1024 } },
  { id: 'GMLS_shot_muz', volume: 0.4, preload: true, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'GMLS_shot', volume: 0.4, preload: true, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'GMLS_spawn', volume: 0.3, preload: true, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 900 } },
  { id: 'GMLS_transition', volume: 0.4, preload: true, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 900 } },
  { id: 'GMLS_run', volume: 0.4, preload: true, instances: 4, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },

  // PLM2 enemy
  { id: 'PLM2_run', volume: 0.4, preload: true, instances: 4, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'PLM2_destroy', volume: 0.4, preload: true, loop: false, spatial: { spatialInnerRange: 512, spatialOuterRange: 1024 } },

  // ROFL enemy
  { id: 'ROFL_idle', volume: 0.4, preload: true, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'ROFL_run', volume: 0.4, preload: true, loop: true, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'ROFL_eat', volume: 0.4, preload: true, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'ROFL_spot', volume: 0.4, preload: true, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
  { id: 'ROFL_burp', volume: 0.4, preload: true, loop: false, spatial: { spatialInnerRange: 128, spatialOuterRange: 512 } },
];

const jsonAssets = {};
const USE_DYNAMIC_LOAD = true;

// add type and concat into one object so we don't have to find the sound extention each soundCheck
_.map(mp3AudioList, (sound) => _.assign(sound, { extension: 'mp3' }));
_.map(oggAudioList, (sound) => _.assign(sound, { extension: 'ogg' }));

// add params to textures
_.map(defaultImages, (texture) => _.assign(texture, { folder: 'images', type: 'image' }));
_.map(uiList, (texture) => _.assign(texture, { folder: 'maps/ui', type: 'image' }));
_.map(mapImageList, (texture) => _.assign(texture, { folder: 'maps/sprites', type: 'image' }));
_.map(aarenaMapImageList, (texture) =>
  _.assign(texture, {
    folder:
      GlobalState.GAME.state?.gameConfig.aarenaTheme || GAME_CONFIG.aarenaTheme
        ? `maps/aarena_skin_${GlobalState.GAME.state?.gameConfig.aarenaTheme || GAME_CONFIG.aarenaTheme}`
        : 'maps/aarena',
    type: 'image',
  }),
);
_.map(aarenMapSpriteList, (texture) => _.assign(texture, { folder: 'aarena', type: 'spritesheet' }));
_.map(paartnerList, (texture) => _.assign(texture, { folder: 'images/paartner', type: 'image' }));
_.map(nftDefaultImage, (texture) => _.assign(texture, { folder: 'images/nft', type: 'image' }));

_.map(spriteList, (texture) => _.assign(texture, { folder: 'spritesheets', type: 'spritesheet' }));
_.map(combatList, (texture) => _.assign(texture, { folder: 'combat', type: 'spritesheet', map: 'aarena' }));
_.map(installationList, (texture) => _.assign(texture, { folder: 'installations', type: 'spritesheet' }));
_.map(decorationsList, (texture) => _.assign(texture, { folder: 'decorations', type: 'spritesheet' }));
_.map(nftFilterList, (texture) => _.assign(texture, { folder: 'filters', type: 'spritesheet' }));

// Construct tiles
_.each(tilesJson, (val, key) => {
  if (val.itemId !== 0) tileList.push({ id: `Tile_LE_${key}`, preload: false, type: 'image', folder: 'images/tiles' });
});
const allSoundsConfig = _.keyBy(_.concat(mp3AudioList, oggAudioList), 'id');

const allTexturesConfig = _.keyBy(
  _.concat(
    defaultImages,
    uiList,
    mapImageList,
    aarenaMapImageList,
    aarenMapSpriteList,
    paartnerList,
    decorationsList,
    nftDefaultImage,
    nftFilterList,
    installationList,
    spriteList,
    combatList,
    tileList,
  ),
  'id',
);

const decorationComposeKey = ['Caamp_Fire', 'Smol_Flower', 'REALM_Globe', 'Laava_Lamp', 'GM_Light', 'Rofl_Gnome'];
const rarityList = ['Common', 'Uncommon', 'Rare', 'Legendary', 'Mythical', 'Godlike'];
const chatList = ['heart', 'exclam', 'happy', 'unhappy', 'omg', 'fire', 'lightning'];
const alchemicaPickupList = [
  'alpha_small',
  'alpha_medium',
  'alpha_large',
  'fomo_small',
  'fomo_medium',
  'fomo_large',
  'fud_small',
  'fud_medium',
  'fud_large',
  'kek_small',
  'kek_medium',
  'kek_large',
];

const createComposedAnimations = (list, animationTypes, animationConfig: AnimConfig): TextureConfig[] => {
  const configs = _.map(list, (key) => {
    return _.map(animationTypes, (type, index) => {
      const animConfig: TextureConfig = {
        id: `${type}_${key}`,
        animationConfig: { configKey: `${key}`, index: Number(index), isLoop: animationConfig.isLoop, hide: !!animationConfig.hide },
      };
      return animConfig;
    });
  });
  return _.flatMap(configs);
};

const chatAnim = createComposedAnimations(['chat'], chatList, { isLoop: false, hide: true });
const flameAnim = createComposedAnimations(['flame'], ['alpha', 'fomo', 'fud', 'kek'], { isLoop: true });
const observerBodyAnim = createComposedAnimations(['observer_body'], ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'yellow'], {
  isLoop: true,
  hide: false,
});
const observerEyeAnim = createComposedAnimations(['observer_iris'], ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'yellow'], {
  isLoop: true,
  hide: false,
});
const alchemica = createComposedAnimations(
  [GlobalState.GAME.state?.gameConfig.gotchiverseTheme || GAME_CONFIG.gotchiverseTheme === 'halloween' ? 'alchemica_candy_x3' : 'alchemica_x3'],
  alchemicaPickupList,
  { isLoop: true, hide: true },
);

const allDecorationAnimations = createComposedAnimations(decorationComposeKey, rarityList, { isLoop: true });
// console.log('allDecorationAnimations', allDecorationAnimations);

const allAnimationsConfig = _.keyBy(
  _.concat(
    animationList,
    alchemica,
    chatAnim,
    flameAnim,
    observerBodyAnim,
    observerEyeAnim,
    allDecorationAnimations,
    _.filter(_.values(allTexturesConfig), ({ animationConfig }) => animationConfig),
  ),
  'id',
);

const getJsonAssets = async (key: string): Promise<AnimationConfig> => {
  const textureConfig = allTexturesConfig[key];
  if (!jsonAssets[key]) {
    try {
      if (!textureConfig?.folder || !textureConfig?.id) {
        console.warn('@getJsonAssets missing textureConfig:', key);
        return jsonAssets[key];
      }
      const { default: jsonData } = await import(`public/animations/${textureConfig.folder}/${textureConfig.id}.json`);
      jsonAssets[key] = jsonData;
    } catch (error) {
      // Turbopack/webpack dynamic import can miss newly added sheets — fetch public URL.
      try {
        const res = await fetch(`/animations/${textureConfig.folder}/${textureConfig.id}.json`);
        if (res.ok) {
          jsonAssets[key] = await res.json();
        } else {
          console.warn('@getJsonAssets LOAD ERROR:', key, error);
        }
      } catch (fetchErr) {
        console.warn('@getJsonAssets LOAD ERROR:', key, error, fetchErr);
      }
    }
  }
  return jsonAssets[key];
};

interface assetLoaderInterface {
  jsonAssets;
  allSoundsConfig;
  allTexturesConfig;
  allAnimationsConfig;
  loadExtra: () => void;
  loadMap: (type: SceneType) => void;
  loadAudio: (key: string) => void;
  startDynamicLoad: () => void;
  getJsonAssets: (key) => any;
  checkTexture: (key: string, url: string, type: string) => Promise<boolean>;
  checkLocalTexture: (key: string) => Promise<boolean>;
  ensureSpritesheet: (key: string, folder: string, frameWidth: number, frameHeight: number) => Promise<boolean>;
  loadPlugins: () => Promise<void>;
}

const startDynamicLoad = async (): Promise<void> => {
  scene.load.on('filecomplete', (key, type, data) => {
    // console.log('filecomplete', key);
    // added to cache
    if (type === 'audio') {
      const soundConfig = allSoundsConfig[key];
      // console.log('@startDynamicLoad: audio', soundConfig, 'loaded!');
      if (soundConfig) {
        // create sound immediatly after load.
        SFXController.createAudio(soundConfig);
        // fadeIn or playSFX sounds based on loops imediatly after adding it to cache becuase this load was triggered by one of this 2 functions.
        if (!soundConfig.preload && USE_DYNAMIC_LOAD && soundConfig.action) {
          switch (soundConfig.action) {
            case 'play':
              SFXController.playFX(soundConfig.id);
              break;
            case 'fadeIn':
              SFXController.fadeIn(soundConfig.id);
              break;
            case 'sound-loop':
              SFXController.soundLoopPlay(soundConfig.id);
              break;
            case 'spatial-play':
              if (SFXController.spatialPlayQueue?.[soundConfig.id]) SFXController.playSpatialFX(SFXController.spatialPlayQueue?.[soundConfig.id]);
              break;
            default:
              break;
          }
          delete soundConfig.action;
        }
      }
    }
  });

  await globalLoadAudio(_.values(allSoundsConfig));
  await globalLoadTexture(_.values(allTexturesConfig));
  scene.load.start();
};

const loadPlugins = async (): Promise<void> => {
  scene.load.scenePlugin('AnimatedTiles', 'AnimatedTiles.js', 'animatedTiles', 'animatedTiles');
  scene.load.plugin('rexoutlinepipelineplugin', 'rexoutlinepipelineplugin.min.js', true);
  scene.load.plugin('rexpinchplugin', 'rexpinchplugin.min.js', true);
};

const globalLoadTexture = async (list: TextureConfig[]): Promise<void> => {
  // console.log('@globalLoadTexture', list, GameController.MAP);
  if (GameController.MAP === 'aarena') list = _.filter(list, ({ map }) => map === GameController.MAP);
  // console.log('@globalLoadTexture:Aarena', list);
  const preloads = USE_DYNAMIC_LOAD ? _.filter(list, ({ preload }) => preload) : list;
  // console.log('preloads', preloads);
  for (let i = 0; i < preloads.length; i++) {
    const texture = preloads[i];
    await loadTexture(texture);
  }
};

const loadTexture = async (texture: TextureConfig): Promise<void> => {
  let config;
  let filePath = texture.folder;
  try {
    if (texture.type === 'spritesheet') {
      // it's animation requires json load
      const jsonData = await getJsonAssets(texture.id);
      if (!jsonData?.tilewidth || !jsonData?.tileheight) {
        // Soft-launch local sheets: still load PNG with known frame size if JSON import missed.
        if (texture.local && (texture.id === 'store' || texture.id === 'cashier')) {
          config = { frameWidth: 256, frameHeight: 256 };
        } else if (texture.local && (texture.id === 'shelf' || texture.id === 'terminal' || texture.id === 'console')) {
          config = { frameWidth: 256, frameHeight: 256 };
        } else {
          console.error(`@globalLoadTexture: ${texture.id}, missing spritesheet json`);
          return;
        }
      } else {
        config = {
          frameWidth: jsonData.tilewidth,
          frameHeight: jsonData.tileheight,
        };
      }
      filePath = `animations/${texture.folder}`;
    }
    const prefix = texture.local ? '/' : staticAssetPrefix;
    scene.load[texture.type](texture.id, `${prefix}${filePath}/${texture.id}.png`, config);
    // console.log('textureLoaded:', texture);
  } catch (error) {
    console.error(`@globalLoadTexture: ${texture.id}, could not be loaded `, error);
  }
};

const globalLoadAudio = async (list: SoundConfig[]) => {
  const preloads = USE_DYNAMIC_LOAD ? _.filter(list, ({ preload }) => preload) : list;
  _.each(preloads, async ({ id }) => {
    await loadAudio(id);
  });
};

const loadAudio = async (key: string): Promise<void> => {
  const sound = allSoundsConfig[key];
  try {
    scene.load.audio(key, `${staticAssetPrefix}sounds/${key}.${sound.extension}`, { instances: sound.instances || 1 });
    if (!sound.preload) scene.load.start();
  } catch (error) {
    console.log('@loadAudio:ERR', error);
  }
};

const loadExtra = () => {
  scene.load.svg('channelIcon', `${staticAssetPrefix}images/channelIcon.svg`);
  scene.load.svg('channelIconMain', `${staticAssetPrefix}images/channelIcon_main.svg`);
  scene.load.image('large_starfield', `${staticAssetPrefix}images/parallax/large_starfield.png`);
  scene.load.image('minimapMask', `${staticAssetPrefix}images/minimapMask3.png`);
  scene.load.image('debugSquare', `${staticAssetPrefix}images/debug.png`);
  scene.load.spritesheet('stars', `${staticAssetPrefix}images/parallax/sheet_stars.png`, {
    frameWidth: 256,
    frameHeight: 256,
  });
  scene.load.start();
};

const loadMap = (type: SceneType) => {
  const folder = type === 'aarena' ? 'aarena' : 'chunks';
  scene.load.json(type, `${staticAssetPrefix}maps/${folder}/master.json`);
};

const checkTexture = async (key: string, url: string, type = 'image'): Promise<boolean> => {
  return await new Promise((resolve, reject) => {
    if (scene.textures.exists(key) && scene.textures?.get(key).key !== '__MISSING') resolve(true);
    // Texture not found, load texture
    scene.load[type](
      key,
      url,
      type === 'svg'
        ? {
            width: 1000,
            height: 1000,
          }
        : undefined,
    );
    scene.load.start();
    scene.load.on(`filecomplete-${type}-${key}`, (key, type, data) => {
      // console.log('@checkTexture:', key, type, data);
      resolve(true);
    });
  });
};

const checkLocalTexture = async (key: string): Promise<boolean> => {
  // console.log('@checkLocalTexture:', key);
  return await new Promise((resolve) => {
    const texture = allTexturesConfig[key];
    if (!texture) {
      resolve(false);
      return;
    }
    if (scene.textures.exists(key) && scene.textures?.get(key).key !== '__MISSING') {
      resolve(true);
      return;
    }

    // Texture not found, load texture
    void loadTexture(texture);
    scene.load.start();
    const event = `filecomplete-${texture.type}-${key}`;
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      scene.load.off(event, onComplete);
      resolve(ok);
    };
    const onComplete = () => finish(true);
    scene.load.on(event, onComplete);
    // Avoid hanging forever if the asset 404s.
    setTimeout(() => finish(scene.textures.exists(key) && scene.textures.get(key)?.key !== '__MISSING'), 8000);
  });
};

/**
 * Force-load a spritesheet from /public when dynamic JSON import failed at preload.
 * Used for soft-launch sheets (store/cashier/shelf) that must not fall back to a pink rect.
 */
const ensureSpritesheet = async (
  key: string,
  folder: string,
  frameWidth: number,
  frameHeight: number,
): Promise<boolean> => {
  try {
    const tex = scene.textures.exists(key) ? scene.textures.get(key) : null;
    if (tex && tex.key !== '__MISSING' && (tex.frameTotal ?? 0) > 0) return true;
    if (tex) {
      try {
        scene.textures.remove(key);
      } catch {
        /* ignore */
      }
    }

    const cfg = allTexturesConfig[key] as TextureConfig | undefined;
    const prefix = cfg?.local ? '/' : staticAssetPrefix;
    const url = `${prefix}animations/${folder}/${key}.png`;
    return await new Promise((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        scene.load.off(`filecomplete-spritesheet-${key}`, onOk);
        scene.load.off('loaderror', onErr);
        resolve(ok);
      };
      const onOk = () => finish(true);
      const onErr = (file: { key?: string }) => {
        if (!file?.key || file.key === key) finish(false);
      };
      scene.load.spritesheet(key, url, { frameWidth, frameHeight });
      scene.load.once(`filecomplete-spritesheet-${key}`, onOk);
      scene.load.once('loaderror', onErr);
      scene.load.start();
      setTimeout(() => {
        const t = scene.textures.exists(key) ? scene.textures.get(key) : null;
        finish(Boolean(t && t.key !== '__MISSING' && (t.frameTotal ?? 0) > 0));
      }, 6000);
    });
  } catch (e) {
    console.warn('@ensureSpritesheet failed', key, e);
    return false;
  }
};

const AssetsController: assetLoaderInterface = {
  loadExtra,
  loadAudio,
  loadMap,
  startDynamicLoad,
  getJsonAssets,
  checkTexture,
  checkLocalTexture,
  ensureSpritesheet,
  loadPlugins,
  jsonAssets,
  allSoundsConfig,
  allTexturesConfig,
  allAnimationsConfig,
};

export default AssetsController;
