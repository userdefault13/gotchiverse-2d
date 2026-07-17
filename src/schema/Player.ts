import { Schema, type } from '@colyseus/schema';

export class Player extends Schema {
  @type('string') sessionId: string = '';
  @type('string') address: string = '';
  @type('string') gotchiId: string = '';
  @type('string') name: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
}
