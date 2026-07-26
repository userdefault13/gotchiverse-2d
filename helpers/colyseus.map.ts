export type ColyseusMapId = 'citaadel' | 'aarena' | 'aarena-rh';

let currentMap: ColyseusMapId = 'citaadel';

export function setColyseusMap(map: ColyseusMapId): void {
  if (map === 'aarena-rh') currentMap = 'aarena-rh';
  else if (map === 'aarena') currentMap = 'aarena';
  else currentMap = 'citaadel';
}

export function getColyseusMap(): ColyseusMapId {
  return currentMap;
}

export function isColyseusAarenaMap(): boolean {
  return currentMap === 'aarena' || currentMap === 'aarena-rh';
}
