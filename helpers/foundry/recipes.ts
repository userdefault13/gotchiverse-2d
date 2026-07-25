import { FoundryAlchemica, FoundryMaterials, MaterialKey } from './types';

export const MATERIAL_ICONS: Partial<Record<MaterialKey, string>> = {
  ironOre: '/animations/spritesheets/foundry/icon_salvage_slag.png',
  copperOre: '/animations/spritesheets/foundry/icon_pulsecore.png',
  aluminumOre: '/animations/spritesheets/foundry/icon_netherlink.png',
  cobaltOre: '/animations/spritesheets/foundry/icon_motebank.png',
  methane: '/animations/spritesheets/foundry/icon_tithe.png',
  noxiousGas: '/animations/spritesheets/foundry/icon_walk_ledger.png',
  steel: '/animations/spritesheets/foundry/icon_salvage_slag.png',
  copperPlate: '/animations/spritesheets/foundry/icon_pulsecore.png',
  aluminumPlate: '/animations/spritesheets/foundry/icon_netherlink.png',
  cobaltIngot: '/animations/spritesheets/foundry/icon_motebank.png',
  wire: '/animations/spritesheets/foundry/icon_netherlink.png',
  bolts: '/animations/spritesheets/foundry/icon_salvage_antenna.png',
  nuts: '/animations/spritesheets/foundry/icon_salvage_antenna.png',
  screws: '/animations/spritesheets/foundry/icon_salvage_antenna.png',
  dishFrame: '/animations/spritesheets/foundry/icon_salvage_dish.png',
  antennaCore: '/animations/spritesheets/foundry/icon_pulsecore.png',
  antennaRelay: '/animations/spritesheets/foundry/icon_salvage_antenna.png',
};

/** @deprecated alias */
export const FOUNDRY_SALVAGE_ICONS = MATERIAL_ICONS;

export type FoundryRecipe = {
  id: string;
  label: string;
  description: string;
  tier: 'smelt' | 'parts' | 'assemble';
  inputs: Partial<FoundryMaterials>;
  power: Partial<FoundryAlchemica>;
  outputs: Partial<FoundryMaterials>;
  imageUrl: string;
};

export const FOUNDRY_RECIPES: FoundryRecipe[] = [
  {
    id: 'smelt-steel',
    label: 'Smelt Steel',
    description: 'Forge iron ore into steel plate.',
    tier: 'smelt',
    inputs: { ironOre: 2 },
    power: { fud: 2 },
    outputs: { steel: 1 },
    imageUrl: '/images/foundry/recipes/recipe_antenna_relay.png',
  },
  {
    id: 'smelt-copper',
    label: 'Smelt Copper',
    description: 'Smelt copper ore into copper plate.',
    tier: 'smelt',
    inputs: { copperOre: 2 },
    power: { fomo: 2 },
    outputs: { copperPlate: 1 },
    imageUrl: '/images/foundry/recipes/recipe_dish_assembly.png',
  },
  {
    id: 'smelt-aluminum',
    label: 'Smelt Aluminum',
    description: 'Smelt aluminum ore into lightweight plate.',
    tier: 'smelt',
    inputs: { aluminumOre: 2 },
    power: { alpha: 2 },
    outputs: { aluminumPlate: 1 },
    imageUrl: '/images/foundry/recipes/recipe_dish_assembly.png',
  },
  {
    id: 'smelt-cobalt',
    label: 'Smelt Cobalt',
    description: 'Smelt cobalt ore into cobalt ingot.',
    tier: 'smelt',
    inputs: { cobaltOre: 2 },
    power: { kek: 1 },
    outputs: { cobaltIngot: 1 },
    imageUrl: '/images/foundry/recipes/recipe_antenna_relay.png',
  },
  {
    id: 'draw-wire',
    label: 'Draw Wire',
    description: 'Draw copper plate into conductive wire.',
    tier: 'parts',
    inputs: { copperPlate: 1 },
    power: { fomo: 1 },
    outputs: { wire: 3 },
    imageUrl: '/images/foundry/recipes/recipe_dish_assembly.png',
  },
  {
    id: 'cut-fasteners',
    label: 'Cut Fasteners',
    description: 'Cut steel into bolts and nuts.',
    tier: 'parts',
    inputs: { steel: 1 },
    power: { fud: 1 },
    outputs: { bolts: 2, nuts: 2 },
    imageUrl: '/images/foundry/recipes/recipe_antenna_relay.png',
  },
  {
    id: 'stamp-screws',
    label: 'Stamp Screws',
    description: 'Stamp steel into screws.',
    tier: 'parts',
    inputs: { steel: 1 },
    power: { fud: 1 },
    outputs: { screws: 4 },
    imageUrl: '/images/foundry/recipes/recipe_antenna_relay.png',
  },
  {
    id: 'spin-dish-frame',
    label: 'Spin Dish Frame',
    description: 'Form aluminum plates and wire into a dish frame.',
    tier: 'parts',
    inputs: { aluminumPlate: 2, wire: 1 },
    power: { alpha: 2 },
    outputs: { dishFrame: 1 },
    imageUrl: '/images/foundry/recipes/recipe_dish_assembly.png',
  },
  {
    id: 'wind-antenna-core',
    label: 'Wind Antenna Core',
    description: 'Wind cobalt, wire, and gases into an antenna core.',
    tier: 'parts',
    inputs: { cobaltIngot: 1, wire: 2, methane: 1, noxiousGas: 1 },
    power: { kek: 1 },
    outputs: { antennaCore: 1 },
    imageUrl: '/images/foundry/recipes/recipe_antenna_relay.png',
  },
  {
    id: 'assemble-antenna',
    label: 'Assemble Antenna Relay',
    description: 'Assemble dish, core, fasteners, and wire into a deployable relay.',
    tier: 'assemble',
    inputs: {
      dishFrame: 1,
      antennaCore: 1,
      wire: 2,
      bolts: 2,
      nuts: 2,
      screws: 2,
    },
    power: { fud: 5, fomo: 5, alpha: 2, kek: 1 },
    outputs: { antennaRelay: 1 },
    imageUrl: '/images/foundry/recipes/recipe_antenna_relay.png',
  },
];

export function getFoundryRecipe(id: string): FoundryRecipe | undefined {
  return FOUNDRY_RECIPES.find((r) => r.id === id);
}

export const MATERIAL_GROUPS: { label: string; keys: MaterialKey[] }[] = [
  {
    label: 'Raw',
    keys: ['ironOre', 'copperOre', 'aluminumOre', 'cobaltOre', 'methane', 'noxiousGas'],
  },
  {
    label: 'Refined',
    keys: ['steel', 'copperPlate', 'aluminumPlate', 'cobaltIngot'],
  },
  {
    label: 'Parts',
    keys: ['wire', 'bolts', 'nuts', 'screws', 'dishFrame', 'antennaCore'],
  },
  {
    label: 'Deployable',
    keys: ['antennaRelay'],
  },
];
