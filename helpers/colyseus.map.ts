export type ColyseusMapId = 'citaadel' | 'aarena';

let currentMap: ColyseusMapId = 'citaadel';

export function setColyseusMap(map: ColyseusMapId): void {
  currentMap = map === 'aarena' ? 'aarena' : 'citaadel';
}

export function getColyseusMap(): ColyseusMapId {
  return currentMap;
}

export function isColyseusAarenaMap(): boolean {
  return currentMap === 'aarena';
}
