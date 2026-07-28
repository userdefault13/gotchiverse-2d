/** Soft-launch Store/Cashier/Shelf overlay — do not put these in official installations.json. */
const official = require('./installations.json');
const storeLocal = require('./store.installations.local.json');
module.exports = Object.assign({}, official, storeLocal);
