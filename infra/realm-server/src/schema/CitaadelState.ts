import { Schema, type, MapSchema } from '@colyseus/schema';
import { Player } from './Player';

export class CitaadelState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type('string') mapId: string = 'citaadel';
}
