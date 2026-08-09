/** Soft-launch Store/Cashier/Shelf/Terminal/Console/Broadcaster/Bazaar/DAO Office/Potion Shop overlay — do not put these in official installations.json. */
const official = require('./installations.json');
const storeLocal = require('./store.installations.local.json');
const consoleLocal = require('./console.installations.local.json');
const broadcasterLocal = require('./broadcaster.installations.local.json');
const bazaarLocal = require('./bazaar.installations.local.json');
const daoOfficeLocal = require('./daoOffice.installations.local.json');
const potionShopLocal = require('./potionShop.installations.local.json');
module.exports = Object.assign(
  {},
  official,
  storeLocal,
  consoleLocal,
  broadcasterLocal,
  bazaarLocal,
  daoOfficeLocal,
  potionShopLocal,
);
