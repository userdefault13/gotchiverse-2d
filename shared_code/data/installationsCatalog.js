/** Soft-launch Store/Cashier/Shelf/Terminal/Console/Broadcaster overlay — do not put these in official installations.json. */
const official = require('./installations.json');
const storeLocal = require('./store.installations.local.json');
const consoleLocal = require('./console.installations.local.json');
const broadcasterLocal = require('./broadcaster.installations.local.json');
module.exports = Object.assign({}, official, storeLocal, consoleLocal, broadcasterLocal);
