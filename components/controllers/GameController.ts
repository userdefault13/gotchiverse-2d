/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/indent */
import SFXController from '../controllers/SFXController';
import Installations from 'components/phaser/Installations';
import Alchemicas from 'components/phaser/Alchemicas';
import Melee from 'components/phaser/Melee';
import Missiles from 'components/phaser/Missiles';
import Parcels from 'components/phaser/Parcels';
import Players from 'components/phaser/Players';
import Enemies from 'components/phaser/Enemies';
import Performance from 'components/utility/performance';
import InputController from 'components/controllers/inputController';
import Router from 'next/router';
import packageJSON from 'package.json';
import FilterdWordList from '../controllers/FilteredWordList';
import {
  InstallationActiveData,
  InstallationData,
  RushAttackData,
  WebSocketObject,
  MouseActiveData,
  RecaptchaTokenData,
  DirectionData,
  AlchemicaData,
  IneractionData,
  ToggleSprintData,
  SelectedPlayer,
  SocketTransferData,
  GlobalChatEventData,
  BubbleChatEventData,
  FocusEventData,
  Damage,
  NFTDisplaySet,
  OrientationData,
  RangedAttackData,
  Teleport,
  SceneType,
  Tip,
  WalletWithdrawData,
  ShopPurchase,
  QuickslotUseData,
  ItemUse,
  Drop,
} from 'types';
import { createTestBodies, getDefaultCameraSettings, getGroupMemberById, toggleUnlimitedZoomOut } from 'helpers/phaser.helper';
import { toast } from 'react-toastify';
import { binarySchemas, decode, decodeSchemaName } from 'shared_code/utils/shared.utils.binary';
import _ from 'lodash';
import {
  MAP_ID_CITAADEL,
  MAP_ID_AARENA,
  DEFAULT_GOTCHI_PROPERTIES,
  MAP_CONFIG_BY_ID,
} from 'shared_code/constants/const.game';
import { handleChatEvent, unsubscribeToChatChannels } from 'contexts/ChatContext/actions';
import {
  colyseusConnect,
  colyseusHandleKeyMove,
  colyseusIsConnected,
  colyseusLocalSpawn,
  colyseusNudgeIfTrapped,
  colyseusSendCombat,
  colyseusSendMove,
  colyseusSendPing,
  colyseusSendTestDrop,
  colyseusTeleportToParcel,
  isColyseusNetcode,
} from 'helpers/colyseus.client';
import {
  colyseusResetParcelSync,
  colyseusSeedParcels,
  colyseusSpawnFromSelectedParcel,
  colyseusUpdateCurrentParcel,
} from 'helpers/colyseus.parcels';
import {
  colyseusLoadInstallations,
  colyseusPreloadNearbyInstallations,
  colyseusResetInstallationSync,
} from 'helpers/colyseus.installations';
import { NFTDisplay } from 'components/phaser/NFTDisplay';
import { scene } from 'components/controllers/SceneController';
import MinigameController from './minigameController';
import AnimationsController from './animationsController';
import MapController from 'components/controllers/MapController';
import GlobalState from 'contexts/GlobalState';
import Pads from 'components/phaser/Pads';
import Quests from 'components/phaser/Quests';
import { setQuickslotUpdate } from 'contexts/RealmContext/actions';
import { shopItemsById } from 'helpers/items.helpers';
import Potions from 'components/phaser/Potions';
import { getParcelTokenIdById } from 'shared_code/utils/shared.utils.parcel';
import { getParcelDataById } from 'helpers/parcels.helper';
import { PARCELS_BY_ID } from 'shared_code/models/model.realm';
const version = packageJSON.version;
// used for onSocket close to determine if user was actualy connected or if the server was down
let wasConnected = false;
let reconnectAttemptNum = 0;

let targetSocket: WebSocketObject;
let socket: WebSocketObject;
let transferSocket: WebSocketObject;

let idleTimer: NodeJS.Timeout;
let stickyToastAlertId;
let socketRetryTimer: NodeJS.Timeout;

export let ENABLE_TESTS = false;

const readyStatyses = { 0: 'CONNECTING', 1: 'CONNECTED', 2: 'CLOSING', 3: 'CLOSED' };

let spawnId: string;
const MAP: SceneType = MAP_ID_CITAADEL; // we default to loading citaadel map

interface QueueUpdate {
  status: 'queued' | 'approved' | 'aborted';
  playerId: number;
  meta?: QueueMeta;
  message?: string;
}

interface QueueMeta {
  position: number;
  size: number;
}

const isDev = ['development', 'local'].includes(process.env.APP_ENV);

// these are stateful overall game customization properties that are disabled by default
// the server will send a 'game-config-update' event to update them

interface GameControllerInterface {
  socketConnect: (selectedPlayer: SelectedPlayer, transferObj?: SocketTransferData, source?: 'init' | 'reconnect' | 'transfer') => void;
  sendData: (
    channel: string,
    action: string | null,
    data?:
      | RushAttackData
      | RangedAttackData
      | InstallationActiveData
      | MouseActiveData
      | DirectionData
      | InstallationData
      | AlchemicaData
      | IneractionData
      | RecaptchaTokenData
      | OrientationData
      | NFTDisplaySet
      | GlobalChatEventData
      | BubbleChatEventData
      | FocusEventData
      | ToggleSprintData
      | ShopPurchase
      | WalletWithdrawData
      | Teleport
      | Tip
      | Drop
      | QuickslotUseData
      | string,
  ) => void;
  handleToastNotification;
  updateSpawnId: (id?: string) => void;
  updateMapType: (type?: SceneType) => void;
  getGameRoute: () => '/combat' | '/play';
  toggleShooting: (state: boolean) => void;
  addIntervalAction: (key: string, action: Promise<boolean>, config) => void;
  MAP: SceneType;
  version: string;
}

async function parseBinaryMessage(data: any) {
  const buffer = await data.arrayBuffer();
  // console.log('Decoding dv of length', buffer.byteLength);
  const { offset, schemaName } = decodeSchemaName(buffer);
  const schemas = {
    enter: binarySchemas.enterEventSchema,
    leave: binarySchemas.leaveEventSchema,
    positions: binarySchemas.positionsEventSchema,
    pong: binarySchemas.pongSchema,
  };
  const message = decode(buffer, schemas[schemaName], offset) as any;
  const channel = binarySchemas.schemasList[message.channel];
  return { channel: channel, data: message.data };
}

function updateSpawnId(id?: string): void {
  spawnId = id || '';
}

const updateMapType = (type?: SceneType): void => {
  GameController.MAP = type || 'citaadel';
};

// called to set up initial game server socket connection
// also called during a server zone to server zone socket transfer if transferKey is passed
async function socketConnect(
  selectedPlayer: SelectedPlayer,
  transferObj?: SocketTransferData,
  source?: 'init' | 'reconnect' | 'transfer',
): Promise<void> {
  console.log('SocketConnect...', source, scene.preloaded);

  if (scene.onSocketReconnect && scene.onSocketReconnect !== source) {
    console.warn('Socket Reconnect loop alreay started!!');
    return;
  }

  if (!scene.preloaded) {
    if (source === 'reconnect' && socketRetryTimer) return clearTimeout(socketRetryTimer);

    scene.onSocketReconnect = source;
    _.delay(async () => await socketConnect(selectedPlayer, transferObj, source), 2000);
    return;
  }

  scene.onSocketReconnect = undefined;

  // Walkable MVP: Colyseus room instead of legacy zone WebSocket protocol
  if (isColyseusNetcode()) {
    const network = GlobalState.WEB3?.state?.currentNetwork;
    // /combat always means aarena even if MAP was briefly stale before the page effect ran.
    const onCombatRoute =
      typeof window !== 'undefined' &&
      (window.location?.pathname === '/combat' || window.location?.pathname === '/combat-rh');
    if (onCombatRoute && GameController.MAP !== 'aarena') {
      GameController.MAP = 'aarena';
    }
    const map =
      GameController.MAP === 'aarena'
        ? network === 'robinhood'
          ? 'aarena-rh'
          : 'aarena'
        : 'citaadel';
    const selectedSpawnLoc =
      map === 'citaadel' && spawnId && spawnId.charAt(0) === 'C' ? spawnId : undefined;
    const cartridgeId = GlobalState.USER?.state?.cartridgeId || null;
    const ok = await colyseusConnect(selectedPlayer, {
      spawnLocId: selectedSpawnLoc,
      map,
      cartridgeId,
    });
    if (!ok) {
      handleToastNotification({
        message: 'Ruh roh, error connecting to the portal. Try refreshing your browser to try again.',
        autoClose: false,
        type: 'error',
      });
      return;
    }

    const aarenaBounds = (MAP_CONFIG_BY_ID as Record<string, { SPAWN_BOUNDS?: { left: number; right: number; top: number; bottom: number } }>)[
      MAP_ID_AARENA
    ]?.SPAWN_BOUNDS;
    const aarenaFallback =
      aarenaBounds != null
        ? {
            x: Math.round((aarenaBounds.left + aarenaBounds.right) / 2),
            y: Math.round((aarenaBounds.top + aarenaBounds.bottom) / 2),
          }
        : { x: 4096, y: 4096 };

    // Prefer live sprite (mid-session reconnect), then selected parcel (citaadel),
    // then server spawn, then map default — never yank aarena to plaza center if we already moved.
    const liveSprite =
      selectedPlayer?.id != null && scene?.[selectedPlayer.id]
        ? scene[selectedPlayer.id]
        : null;
    const livePos =
      liveSprite && typeof liveSprite.x === 'number' && typeof liveSprite.y === 'number'
        ? { x: liveSprite.x, y: liveSprite.y }
        : null;
    const parcelSpawn = map === 'citaadel' ? colyseusSpawnFromSelectedParcel(selectedSpawnLoc) : null;
    const spawn =
      livePos ||
      parcelSpawn ||
      colyseusLocalSpawn() ||
      (map === 'aarena' || map === 'aarena-rh' ? aarenaFallback : { x: 42 * 64 + 10 * 64, y: 52 * 64 + 10 * 64 });
    let previewMaxHp = 1000;
    let previewMaxAp = 100;
    let previewTraits: {
      maxHealth?: number;
      maxAP?: number;
      alchemicaCarryingCapacity?: number;
      defense?: number;
      evasion?: number;
      luck?: number;
      attackSpeed?: number;
      meleePower?: number;
      rangedPower?: number;
      healthRegenAmount?: number;
      apRegenAmount?: number;
    } | null = null;
    try {
      const { computeClientCombatTraits } = await import('helpers/gotchi.helper');
      const preview = computeClientCombatTraits(selectedPlayer as any);
      previewMaxHp = preview.maxHealth || 1000;
      previewMaxAp = preview.maxAP || 100;
      previewTraits = preview;
    } catch {
      /* keep defaults */
    }
    try {
      await Players.onPlayerSocketInit({
        id: selectedPlayer.id,
        name: selectedPlayer.name,
        x: spawn.x,
        y: spawn.y,
        health: previewMaxHp,
        maxHealth: previewMaxHp,
        // Preserve Nakey/Observoor so Phaser uses defaultGotchi (not a missing 0x texture).
        isSpectator: Boolean(selectedPlayer.isSpectator),
      } as any);
    } catch (e) {
      console.warn('onPlayerSocketInit (colyseus) failed', e);
    }

    // Snap server position to selected parcel when the room ignored spawnLocId.
    if (parcelSpawn) {
      colyseusSendMove(parcelSpawn.x, parcelSpawn.y);
    }

    if (map === 'citaadel') {
      colyseusResetParcelSync();
      colyseusResetInstallationSync();
      colyseusSeedParcels(spawn.x, spawn.y, true);
      colyseusUpdateCurrentParcel(spawn.x, spawn.y);

      // Colyseus has no AOI installation payloads — hydrate from Base contract grids.
      const ownedNearSpawn = (GlobalState.REALM?.state?.ownedParcels || [])
        .map((p: { parcelId?: string; id?: string }) => p.parcelId || p.id)
        .filter((id: string | undefined): id is string => Boolean(id && String(id).charAt(0) === 'C'));
      const installTargets = _.uniq(
        [selectedSpawnLoc, scene.lastParcelCollisionId, ...ownedNearSpawn].filter(Boolean) as string[],
      );
      colyseusPreloadNearbyInstallations(spawn.x, spawn.y, {
        force: true,
        prioritize: selectedSpawnLoc || scene.lastParcelCollisionId,
        maxParcels: 20,
      });
      void colyseusLoadInstallations(installTargets).then(() => {
        const retryIds = _.uniq(
          [selectedSpawnLoc, scene.lastParcelCollisionId].filter(Boolean) as string[],
        );
        if (!retryIds.length) return;
        window.setTimeout(() => {
          void colyseusLoadInstallations(retryIds, { force: true });
          colyseusPreloadNearbyInstallations(spawn.x, spawn.y, { force: true });
        }, 1500);
      });
    }

    // Seed HUD traits so bars aren't "undefined / undefined"
    const defaultTraits = {
      alchemicaCarryingCapacity: previewTraits?.alchemicaCarryingCapacity ?? 100,
      maxHealth: previewMaxHp,
      ap: previewMaxAp,
      maxAP: previewMaxAp,
      defense: previewTraits?.defense ?? 0,
      evasion: previewTraits?.evasion ?? 0,
      luck: previewTraits?.luck ?? 0,
      speed: previewTraits?.attackSpeed ?? 1,
      melee: previewTraits?.meleePower ?? 0,
      range: previewTraits?.rangedPower ?? 0,
      regen: previewTraits?.healthRegenAmount ?? 0,
      apRegenAmount: previewTraits?.apRegenAmount ?? 0,
      healthRegenAmount: previewTraits?.healthRegenAmount ?? 0,
    };
    GlobalState.REALM.dispatch({
      type: 'UPDATE_PLAYERS_HEALTH',
      health: previewMaxHp,
    });
    GlobalState.REALM.dispatch({
      type: 'UPDATE_USER_TRAITS',
      userTraits: defaultTraits,
      userTraitsBases: { ...defaultTraits },
      userWearableTraitBonuses: {},
    });

    GlobalState.PHASER.dispatch({
      type: 'UPDATE_CONNECTED',
      connected: true,
    });
    GlobalState.PHASER.dispatch({
      type: 'UPDATE_SOCKET_CONNECTED',
      socketConnected: true,
    });

    // Simple ENTER NOW lobby (no real queue) — use 'approved' so ENTER NOW is shown.
    if (map === 'aarena' || map === 'aarena-rh') {
      // Ensure PVP shoot mode + weapons are live for arcade combat (mapConfig is set at scene create).
      const shoot = scene?.mapConfig?.SHOOT_MODE as 'PVE' | 'PVP' | undefined;
      InputController.updateShootMode(shoot);
      toggleShooting(Boolean(shoot));
      GlobalState.REALM.dispatch({
        type: 'UPDATE_AARENA_QUEUE',
        aarenaQueue: { state: true, status: 'approved' },
      });
      // Server spawn should be clear; still nudge if FE/server desync lands in a block.
      setTimeout(() => colyseusNudgeIfTrapped(), 100);
    } else {
      // Colyseus citaadel is walkable only — keep legacy mapConfig.SHOOT_MODE from arming clicks.
      InputController.updateShootMode(undefined);
      toggleShooting(false);
    }

    // Legacy zone sockets start music in onopen; Colyseus has no onopen — start BGM here.
    SFXController.musicPlay(
      GlobalState.GAME.state.gameConfig.miniGameRoundActive
        ? MinigameController.getMusicTheme()
        : SFXController.getDefaultMusicTheme(),
    );
    SFXController.ensureMusicUnlocked();

    return;
  }

  let socketUrl = transferObj?.socketUrl;
  let zoneId = transferObj?.zoneId;
  const transferKey = transferObj?.transferKey;
  const isSocketTransfer = Boolean(transferKey);

  targetSocket = isSocketTransfer ? transferSocket : socket;
  // gabage collect any previous socket connection to this type of socket (regular or transfer)
  if (targetSocket) {
    targetSocket.onopen = null;
    targetSocket.onmessage = null;
    targetSocket.onclose = null;
    targetSocket.onerror = null;
    targetSocket.close();
  }
  // if (process.env.APP_ENV === 'local') socketUrl = process.env.SERVER_URL;
  // if the destination socket URL is not passed we look it up
  if (!socketUrl) {
    // if the destination socket URL is not passed we look it up
    let socketLookupUrl = `${process.env.NEXT_PUBLIC_API_URL}/realm/socket?owner=${selectedPlayer.owner}`;
    if (GameController.MAP) {
      socketLookupUrl += `&map=${GameController.MAP}`;
    }

    if (!selectedPlayer.isSpectator) {
      socketLookupUrl += `&gotchi=${selectedPlayer.id}`;
    }

    if (spawnId) {
      socketLookupUrl += `&spawnLocId=${spawnId}`;
    }

    // fetch the socket url based on player position
    try {
      const socketData = await fetch(socketLookupUrl).then(async (response) => await response.json());
      socketUrl = socketData.socketUrl;
      if (isDev) console.log('@socketConnect:GET socketData:', socketData);
      zoneId = socketData.id;
    } catch (e) {
      console.warn('Failed to load socket URL', e);
    }
  }

  // we weren't able to generate a socket URL to connect to
  if (!socketUrl) {
    handleToastNotification({
      message: 'Ruh roh, error connecting to the portal. Try refreshing your browser to try again.',
      autoClose: false,
      type: 'error',
    });
    return;
  }

  targetSocket = new WebSocket(socketUrl);
  targetSocket.zoneId = zoneId;
  // const hadExistingSocketByType = Boolean(isSocketTransfer ? transferSocket : socket);
  if (isSocketTransfer) {
    transferSocket = targetSocket;
  } else {
    socket = targetSocket;
  }
  // console.log(`Connect socket url: ${socketUrl} isSocketTransfer: ${isSocketTransfer} hadExistingSocketByType: ${hadExistingSocketByType}`);

  // don't update socket references in the rest of the app for a socket transfer until the tranfer is complete
  if (!isSocketTransfer) {
    broadcastSocketChange(targetSocket);
  }

  targetSocket.emit = (channel: string, data) => {
    data = { channel, data };
    if (targetSocket.readyState === 1) {
      // readyState CONNECTED
      targetSocket.send(JSON.stringify(data));
    } else {
      const readyState = { 0: 'CONNECTING', 1: 'CONNECTED', 2: 'CLOSING', 3: 'CLOSED' }[targetSocket.readyState];
      console.warn(
        `tried to send message to socket when connection was not ready. Connection state: ${readyState}. Message channel: ${channel}, data:`,
        data,
      );
    }
  };

  targetSocket.onopen = async () => {
    const playerData = Players.getPlayerData();
    // beta admin command hook to issue commands for the mini-game mode
    // This works against a logged whitelist of admins so users can't try anything funny
    (window as any).betaAdminCommand = function (...args) {
      targetSocket.emit('beta-admin-command', JSON.stringify(args));
    };
    if (!isSocketTransfer) {
      SFXController.musicPlay(
        GlobalState.GAME.state.gameConfig.miniGameRoundActive ? MinigameController.getMusicTheme() : SFXController.getDefaultMusicTheme(),
      );
    }
    if (isDev) console.log('Connection opened.', targetSocket);

    GlobalState.PHASER.dispatch({
      type: 'UPDATE_SOCKET_CONNECTED',
      socketConnected: true,
    });

    // ensure any retry timeouts are cancelled
    if (socketRetryTimer) {
      clearTimeout(socketRetryTimer);
      socketRetryTimer = null;
    }
    wasConnected = true;
    reconnectAttemptNum = 0;
    // dismiss any sticky error messages that may have previously been displayed
    if (!isSocketTransfer) {
      if (stickyToastAlertId) {
        toast.dismiss(stickyToastAlertId);
      }
      stickyToastAlertId = null;
    }

    // check if this client version is being loaded for the first time and if so, display matching release notes
    // be sure to increment the package.json version and add a matching entry below if desired
    if (localStorage.getItem('clientVersion') !== version) {
      localStorage.setItem('clientVersion', version);
      const latestVersionNotes = {
        '0.3.7': `New updates in v${version}
        • Upgrade modal shows Claim button when finished!
        • Fixed tile unequipping issue when installations are on top !
        • Various UI optimisations!`,
        '0.3.10': `New updates in v${version}
        • My Parcels now displayed first for parcel owners
        • Fixed sprinting VFX & SFX!
        • Fix mini map toggle state!
        • Various UI optimizations!`,
        '0.3.11': `New updates in v${version}
        • Fix for Gotchi movement around installations.`,
        '0.3.12': `New updates in v${version}
        • Move Installations and Tiles added
        • New Dark Magenta Tiles
        • Press Esc close build mode
        • New intro sound FX
        • Upgrade/Speedup w/ GLTR bug fixes`,
        '0.3.13': `New updates in v${version}
        • New chat bubble indicator as gotchis type`,
        '0.3.14': `New updates in v${version}
          • Batch equip / unequip functionality for tiles and installations!
          • New inventory filter
          • New Game Guide button on homepage
          • Bug fixes and optimizations`,
        '0.3.15': `New updates in v${version}
          • Access rights for Upgrading Installations implemented!
          • Updated Minimap with zooming
          • Add more information to Upgrades panel
          • Add Sort by Kinship to Gotchi select screen
          • Bug fix: React UI bleeding through to Phaser
          • Other bug fixes and optimizations`,
        '0.3.17': `New updates in v${version}
          • New hotkeys for toggling Chat and Chat Bubbles
          • New Gotchi Spin emote!
          • New Gotchi Acceleration / Deceleration (Alpha Preview)
          • New localized audio for the Graand Fountain!`,
        '0.3.18': `New updates in v${version}
          • Access rights added to "speed-up upgrade"
          • Capacity added to upgrade dashboard
          • Fix hotkeys for Windows
          • Fix sprinting after HP is used up bug
          • Fix Gotchi spin bug
          • Various other bug fixes and optimizations`,
        '0.3.19': `New updates in v${version}
          • Probability of size 1 and .5 alchemica chunks during spillovers now increase by Aaltar level
          • Fix zooming choppiness
          • Implement toggle for spawning on borrowed / owned parcel
          • Fix appearance of 8 with slash through looking like 0`,
        '0.4.1': `New updates in v${version}
          • Add Recipe Book filters
          • Spawn select sorts now persistent through sessions
          • Fix District list scrolling issue
          • Fix tile mouse clicking bug
          • Fix Tent installation placement`,
        '0.4.2': `New updates in v${version}
           • Fancy server zones behind the scenes.
          `,
        '0.4.3': 'LIMITED PREVIEW - Craft and equip NFT displays to display Aavegotchi-related assets in the Gotchiverse!',
        '0.4.4': 'LIMITED PREVIEW - Craft and equip NFT displays to display Aavegotchi-related assets in the Gotchiverse!',
        '0.4.6': `New in this release:
         •  Craft and equip NFT Displays to show off NFTs in the Gotchiverse
         •  NFT Displays come in Basic (unlimited) and LE Golden (craftable for only two weeks!)
         •  Craft and equip the Bounce Gate to enable anyone to spawn on your parcel. Charge the Gate with GLTR and increase your position in the Priority leaderboard with Alchemica!
         •  The Gotchiverse is now accessible to everyone! Join as an Observooor, a new player type that can move, build, and chat, but cannot farm or pick up Alchemica.
         •  Many other bug fixes and improvements.

        COMMENCE THE GOTCHISSANCE 👻`,

        '0.4.10': `New updates in v${version}
         • Haappy Halloween Gotchigang!
         • Get ready to SMAASH some pumpkins!
         • See you at the party 🎃💀👻
         • Event begins at 2PM UTC!`,

        '0.4.12': `New updates in v${version}
          • NEW Whitelist Parcel Access Rights! (Whitelists must still be created and updated via https://app.aavegotchi.com/my-realm)
          • Altar Level now displays in Spawn Screen
          • Multiple NFT Display issues sorted
          • Testing new anti-bot software with Proof of Humanity check for flagged accounts
          • Bug fixes / optimizations `,

        '0.4.14': `New updates in v${version}
          •  NFT Displays now support Listing and Buying FAKE Gotchis!
          •  Alchemica pickup quantity is now displayed during pickups
          •  NFT images now take up the full NFT Display hologram
          •  Parcel tokenID displayed in spawn screen
          •  Bounce Gate counter now displays live participant count instead of lifetime
          •  Various bug fixes`,

        '0.4.15': `New updates in v${version}
          • NEW: Click on Bounce Gate to view event info
          • NEW: Copy parcel URL from Bounce Gate popup
          • NEW: Travel between events via the Bounce Gate in-game
          • Allow channeling, emptying reservoir, equipping for whitelisted addresses
          • Various UI bug fixes`,

        '0.4.16': `New updates in v${version}
          • Join us during Hangout for a good ol’ fashioned Tooorkey Chaase!
          • Parcel surveying completion shows notification
          • Various bug fixes and optimizations
          • Can now equip/unequip/upgrade installations with Observooors
          • NFT Display hologram now displays video with sound
         `,

        '0.5.0': `New updates in v${version}
          • Aarena Limited Preview is liveeee! Use WASD or direction keys to move, left/right mouse click to attack, and hold down left/right mouse click to execute CHARGE attacks!
          • Can now use mouse click to move (Citaaadel only)
         `,
        '0.5.3': `New updates in v${version}
         • Various bug fixes including for sprinting, withdrawals, and some phantom alchemica`,
        '0.5.5': `New updates in v${version}
        • Gotchi trait based alchemica max carry capacity
        • Various bug fixes including some app loading issues`,
        '0.5.7': `New updates in v${version}
        CITAADEL
        • Bigger NFT Displays and LE Golden NFT Displays are now craftable
        • Various Bug fixes

        AARENA
        • PLAYTEST #2 IS LIVE until 2023-01-31 3pm UTC! 
        • Paampkins and Toorkeys now spawn randomly in the combat zone
        • New leaderboard  live at https://gotchiverse.io/leaderboard
        • Lots more leaderboard metrics including destructible / enemy hits and kills, damage and kills by type: melee, range, rush, snipe. The latter are available by API: api.gotchiverse.io/leaderboard/all
        • Lots of bug fixes including invisible gotchi scenarios
        • New and updated combat vfx and sfx including for evasion
        • Environmental spatial sounds like with cauldron
        • Melee attacks can now be done with R key and ranged with Q key
        • 30 second respawn timeout now enforced`,
        '0.6.0': `New updates in v${version}
        • Completely redesigned verse.aavegotchi.com landing page
        • Citaadel and Aarena UI and HUD have been revamped
        • Sprinting in Citaadel now burns AP just like in Aarena
        • Added paging to NFT Display Gallery
        • Lots of bug fixes
        
        Going live during the 2023-02-18 2pm UTC Saturday Hangout:
        • The Battle Aarena opens for the next round of testing after additional trait balancing and improvements!
        • Introducing SUPER CHAT – Make it rain alchemica with a message broadcast to all players!
        • Player Wallet! You can now deposit / withdraw Alchemica into a new gasless Gotchiverse specific in-game wallet used for SUPER CHAT tipping and upcoming in-game features.`,
        '0.6.2': `New updates in v${version}
        • The Battle Aarena is open with a reskinned map to celebrate ETHDenver! 
        • For a limited time new players can experience the Gotchiverse and Aarena without owning an Aavegotchi using Nakey Gotchis! Nakey Gotchis can do everything a normal Aavegotchi can, except pick up tokens. For that, you'll need the real thing!
        • Some bug fixes and enhancements including for combat`,
        '0.6.3': `New updates in v${version}
        • Gotchi Wearable boosts are now live in the Gotchiverse! Up to 10 combat stats are boosted. Head over to our Discord for some juicy alpha on it 🤓 
        • Round 2 Parcel Rolls are also now live with the passing of DAO Vote AGIP 58. You can survey your parcels a second time starting 2023/03/04!
        • Added a SUPERCHAT Tippers column to Aarena leaderboard
        • Aarena improvements including a new evade animation
        • Gotchi selection screen improvements and other bug fixes`,
        '0.6.4': `New updates in v${version}
        • Some frenly Rofls have something to tell you -- be on the lookout during the haangout! 
        • Gotchi Wearable boosts for movement speed are now live! Values may change during ongoing trait balancing.
        • Aarena Leaderboard now supports alternative rankings via clicking on column headers. Want to see who the biggest tippers are? Just click the SUPERCHAT column header.
        • Roll your mouse over the Combat Traits panel to display a breakdown of bonuses from Gotchi Traits and Wearables.
        • Misc. smol bug fixes and improvements!`,
        '0.6.5': `New updates in v${version}
        • A brand new in-game Item Shop will be available in both Aarena and Citaadel! First items available are HP and AP potions!
        • New Gotchi "Quickslots" inventory - consume equipped consumeables by clicking on a quickslot icon or pressing 1 to 4 hotkeys.
        • An equipped potion will drop along with Alchemica during PVP death! Use em' or lose em' Frens!
        • Gotchi Wearable boosts for Melee and Ranged damage are now enabled! Rollover your mouse over your Gotchi profile in bottom left corner to see your boosts!
        • Misc. smol bug fixes and improvements!`,
        '0.6.6': `New updates in v${version}
        • The Gotchi Scientists have been working OT to create an simulacrum of a Lickquidator that Aavegotchis can practice attacking. They have deemed it the PROTOLICK MODEL 1.  Summon it into the Aarena if you dare! 
        • The "Rekt" screen now displays a superchat leaderboard
        • UI updates
        • Performance improvements for NFT Displays
        • Bug fixes`,
        '0.7.0': `New updates in v${version}
        • New Alchemica Breadcrumbs feature: Click on an alchemica icon in the top bar PLAYER WALLET (or press numeric keys 7 8 9 or 0) to start leaving a trail of alchemica breadcrumbs! 
        • PROTOLICK bots from the ITEM SHOP can now be spawned in the Citaadel! Citaadel is now in PVE combat mode so use keys to move and your mouse to attack.
        • You can now switch parcels directly from the Gotchi Select Screen or choose to spawn your Gotchi on it's last saved LAST POSITION in Citaadel
        • Enemies and Potions now show up on the minimap, new Enemy VFX and SFX, Enemy TTL indicator, and other misc. enhancements
        • Fixed environment collision issues (prevent Gotchis from rushing and getting stuck in walls) and other misc. bug fixes
        • Wearables Patch 3 is live!`,
        '0.7.1': `New updates in v${version}
        • ProtoLick Model II is live! Summon them from the Shop but beware, they're NAASTY! 
        • Strange Rofls have started appearing around the Saacred Roots! It's said they crave bits of Alchemica...
        • Combat keys now map to left and right Gotchi hands! The combat type (melee or ranged) now depend on what is equipped in that hand. Hand wearable attack bonuses and AP Cost Multiplier are now specific to each hand.
        • You can now switch Gotchi movement controls from Arcade (WASD) to MOBA (Mouse) via SETTINGS!`,
        '0.7.2': `New updates in v${version}
        • ProtoLick Model II is stronker! It now has double the HP and cost more FUD to summon. 
        • Bugfix: The Player Info panel now includes equipped hand wearable weapon bonuses to Melee Damage and Ranged Damage stats displayed.
        • Other small bug fixes and optimizations.`,
        '0.7.3': `New updates in v${version}
        • 6 new Tile decorations are now available to craft on your parcel!
        • a new Gotchi Selection screen chock full of useful in-game and on-chain data
        • REKT in the Aarena? Skip a 5-minute respawn cooldown with the new buy-back button: REJOIN NOW. Proceeds rain down directly into the Aarena with your respawn.
        • More reliable knockback forces on missile and melee attacks
        • SPK > 50 now increases your evade rate through boosting LUCK instead of boosting base evade rate`,
        '0.7.4': `New updates in v${version}
        • ProtoLicks no longer auto-expire after 10 minutes. They'll remain on the map until they're defeated!`,
      };
      // add a line like this to 0.7.3 release
      //  • REKT in the Aarena? Skip the 5-minute respawn cooldown by using PLAYER WALLET and the REJOIN NOW button. Respawn early will rain the buy-back tokens onto the map with you!
      if (latestVersionNotes[version]) {
        _.delay(function () {
          handleToastNotification({
            message: latestVersionNotes[version],
            autoClose: false,
            type: 'info',
            customToastClass: 'wideToast',
          });
        }, 2000);
      }
    }

    if (!isSocketTransfer) {
      const grecaptcha = (window as any).grecaptcha;
      grecaptcha.enterprise.ready(async function () {
        // this generates an encrypted recaptcha enterprise token to validate server side with the connection
        let token;
        if (GlobalState.GAME.state.gameConfig.enableRECAPTCHA) {
          token = await grecaptcha.enterprise.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'SOCKET_CONNECT' });
        }

        playerData.authToken = localStorage.getItem('authToken');
        sendData('enter', null, _.assign({}, playerData, { version, recaptchaToken: token, userAgent: navigator.userAgent, spawnLocId: spawnId }));
        // clear the spawnLocId after passing it, so that it doesn't get passed again on next disconnect/reconnect
        spawnId = null;
      });
    } else {
      // socket zone transfers authenticate in a different manner, through a socket-transfer channel after opening the socket
      // this does not use sendData as we haven't yet set our primary socket variable to this secondary socket
      targetSocket.emit('socket-transfer', _.assign({}, playerData, { transferKey }));
    }

    if (idleTimer) {
      clearInterval(idleTimer);
    }
    // sent a ping every 5 seconds to prevent an inactivity socket timeout
    idleTimer = setInterval(sendPing, 5000);
  };

  targetSocket.onmessage = async (message) => {
    // Some messages are sent in binary, some aren't
    let channel, data;
    if (message.data instanceof Blob) {
      ({ channel, data } = await parseBinaryMessage(message.data));
    } else {
      ({ channel, data } = JSON.parse(message.data));
    }
    // console.log('Channel:', channel, data, (message.data instanceof Blob));
    // Performance.end(channel);
    switch (channel) {
      case 'interaction': {
        // console.log('server interaction', data);
        // example emote: {"action": "emote", "data": { "label": "heart_chat", "id": "13499" } }
        // example focus: {"action": "focus", "data": { "label": "1", "id": "13499" } }
        const action = data?.action;
        const actionData = data?.data;
        if (action && actionData) {
          if (action === 'emote') {
            Players.handleEmoteEvent(actionData);
          } else if (action === 'focus') {
            Players.updateFocusTransparency({ id: actionData.id, state: actionData.label === '1' });
          } else if (action === 'spinStart') {
            Players.handleStartSpin(actionData);
          } else if (action === 'spinStop') {
            Players.handleStopSpin(actionData);
          } else {
            console.warn('Unknown action: ', action);
          }
        }
        break;
      }
      case 'pong': {
        Performance.end('ping');
        // this adds commas
        [
          'playerCountLocal',
          'playerCountGlobal',
          'alchemicaCountLocal',
          'alchemicaCountGlobal',
          'queueCountSpillovers',
          'queueCountPickups',
          'queueCountWithdrawls',
        ].forEach((updateCount) => {
          if (!isNaN(Number(data[updateCount]))) {
            data[updateCount] = Number(data[updateCount]).toLocaleString();
          }
        });
        const {
          playerCountLocal,
          playerCountGlobal,
          alchemicaCountLocal,
          alchemicaCountGlobal,
          queueCountSpillovers,
          queueCountPickups,
          queueCountWithdrawls,
        } = data;
        const isCitaadel = GameController.MAP === MAP_ID_CITAADEL;
        const mapAlchemicaStr: string = isCitaadel ? `${alchemicaCountLocal} in Zone | ${alchemicaCountGlobal} on Map` : `${alchemicaCountGlobal}`;
        GlobalState.PHASER.dispatch({
          type: 'UPDATE_PLAYERS_ONLINE',
          playersOnline: `${playerCountLocal} on Server | ${playerCountGlobal} on Map`,
          mapAlchemica: mapAlchemicaStr,
          queues: `Pickup ${queueCountPickups} | Spillover ${queueCountSpillovers} | Withdrawal ${queueCountWithdrawls}`,
        });
        break;
      }
      case 'positions':
        if (data?.player?.length) {
          Performance.end('positions');
          Players.handlePositions(data.player);
        }
        if (data?.missile?.length) {
          Missiles.updatePosition(data.missile);
        }
        if (data?.melee && data.melee.length) {
          data.melee.forEach((melee) => Melee.handleEvent({ action: 'move', melee: melee }));
        }
        if (data?.enemy?.length) {
          Enemies.updatePosition(data.enemy);
        }

        break;
      case 'collision':
        if (data.type === 'quest') {
          Quests.handleEvent(data);
          return;
        }
        Players.handleCollisions(data);
        if (data.type === 'hoodCollision') GlobalState.REALM.dispatch({ type: 'UPDATE_CURRENT_DISTRICT', currentDistrict: data.district });
        if (data.type === 'parcelCollision') {
          // setup Current parcel based on BE
          let currentParcel = null;
          if (data?.parcel?.type) {
            currentParcel = PARCELS_BY_ID[data.parcel.id];
            if (data.parcel.owner && currentParcel) _.assign(currentParcel, { owner: data.parcel.owner });
            if (currentParcel?.district != null) {
              GlobalState.REALM.dispatch({ type: 'UPDATE_CURRENT_DISTRICT', currentDistrict: Number(currentParcel.district) });
            }
            if (currentParcel) currentParcel = _.pick(currentParcel, ['tokenId', 'parcelHash', 'owner', 'district']);
          }

          GlobalState.REALM.dispatch({ type: 'UPDATE_CURRENT_PARCEL', currentParcel });
          scene.lastParcelCollisionId = data.parcel?.type && data.parcel.id ? data.parcel.id : undefined;
        }

        if (data.type === 'fireCollision' || data.type === 'meleeCollision') {
          // console.log('@GameController receive collision:', data);
          if (data.update) {
            const group = data.type === 'fireCollision' ? 'missiles' : 'meleeGroup';
            const phaserObject: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container = getGroupMemberById(data.id, group);
            if (data.update.hitObjectType && phaserObject) phaserObject.setData('hitType', data.update.hitObjectType);
          }
        }

        // not used at this point
        // if (data.type === 'installationCollision') {
        //   // Installations.handleCollision(data.id, data.state);
        // }
        if (data.type === 'nftDisplay') {
          NFTDisplay.setPreview(data);
          if (!data.open) {
            GlobalState.UI.dispatch({
              type: 'UPDATE_NFT_DISPLAY_ADMIN',
              nftDisplayAdminState: { open: false, installationId: undefined },
            });
          }
        }
        break;
      case 'health-changed': {
        const { id, health, damage, type } = data as Damage;
        if (type === 'enemy') {
          Enemies.updateHealthBar({ id, health, damage }, data.damage > 0);
        } else {
          Players.updateHealth({ id, health });
        }
        break;
      }
      case 'ap-changed':
        {
          const { id, ap, type } = data;
          if (type === 'enemy') {
            Enemies.updateAP({ id, ap });
          } else {
            GlobalState.REALM.dispatch({
              type: 'UPDATE_PLAYERS_AP',
              AP: ap,
            });
          }
        }
        break;
      case 'installation-share-url': {
        const { shareUrl } = data;
        // TODO: implement, return to user to share ...
        alert(shareUrl);
        break;
      }
      case 'enter':
        // console.log('Received enter event with types:', data);
        // Enter data is how all game objects will now appear, no longer just for players.
        // When a player enters an AOI zone all objects for that zone are sent together in a single message here
        // the array of items are already split by type
        if (data?.player?.length) {
          void Players.addPlayers(data.player);
        }
        if (data?.item?.length) {
          Alchemicas.create(data.item);
        }
        if (data?.inventoryItem?.length) {
          Potions.create(data.inventoryItem);
        }
        if (data?.enemy?.length) {
          void Enemies.create(data.enemy);
        }
        if (data?.parcel?.length) {
          Parcels.create(data.parcel);
        }
        if (data?.installation && data.installation.length) {
          // console.log('receivedInstallation', data.installation);
          Installations.createByIds(data.installation);
        }
        if (data?.tile?.length) {
          Installations.createByIds(data.tile);
        }
        if (data?.missile?.length) {
          Missiles.create(data.missile);
        }
        if (data?.melee && data?.melee?.length) {
          Melee.create(data.melee);
        }
        if (data?.pad?.length) {
          // Pad collision type short for teleportation-pad, it usually comes with a use prop.
          Pads.create(data.pad);
        }
        if (data?.quest?.length) Quests.create(data.quest);

        break;
      case 'leave':
        // console.log('Received leave event with types:', data);
        // See 'enter' details above
        if (data && _.size(data) === 0) {
          // when a leave event is passed with an empty object it means to clear all AOI data except for the player themselves
          // this happens when the player is respawning far away for example, where all objects will be new, or when server is rebuilding AOI from scratch
          clearDynamicData();
        } else {
          if (data?.player?.length) {
            Players.removePlayers(data.player);
          }
          if (data?.item?.length) {
            Alchemicas.destroy(data.item);
          }
          if (data?.inventoryItem?.length) {
            Potions.destroy(data.inventoryItem);
          }
          if (data?.enemy?.length) {
            Enemies.destroy(data.enemy);
          }
          if (data?.parcel?.length) {
            Parcels.destroy(data.parcel);
          }
          if (data?.installation?.length) {
            Installations.destroyByIds(data.installation);
          }
          if (data?.tile?.length) {
            Installations.destroyByIds(data.tile);
          }
          if (data?.missile?.length) {
            Missiles.destroy(data.missile);
          }
          if (data?.melee?.length) {
            Melee.destroy(data.melee);
          }
          if (data?.pad?.length) {
            // this will work since is only one landmark in the game, update logic if multiple landmarks!
            // SFXController.musicPlay(SFXController.getDefaultMusicTheme());
          }
          if (data?.quest?.length) Quests.destroy(data.quest);
        }
        break;
      case 'kicked':
        console.log('Socket.kicked', data);
        // this player was kicked, alert the reason
        handleToastNotification({
          message: data.message || 'Disconnected. A new connection for this account was made.',
          autoClose: false,
          type: 'error',
          link: data?.link,
        });
        // prevent the socket from reconnect spamming
        scene.unrecoverableSocketError = data.unrecoverableSocketError;
        targetSocket.close();
        break;
      case 'items':
        Alchemicas.handleEvent(data);
        break;
      case 'parcels':
        void Parcels.create(data);
        break;

      case 'bodies_test':
        createTestBodies(scene, data);
        break;
      case 'game-config-update':
        handleGameConfigUpdate(data);
        break;
      case 'map-config-update':
        handleMapConfigUpdate(data);
        break;
      case 'login-queue-update':
        await handleLoginQueueUpdate(data);
        break;
      case 'chat': {
        let message = data.message;
        // profanity filter
        if (message && data.type !== 'SERVER') {
          message = FilterdWordList.filterStrMemorized(message);
          data.message = message;
        }
        handleChatEvent({ ...data, type: data.type || 'USER' }, GlobalState.CHAT.dispatch);
        break;
      }
      case 'player-visibility':
        // console.log('player-visibility: ', data);
        // eslint-disable-next-line no-case-declarations
        if (data.visible) {
          Players.handleRespawn(data.id);
        } else {
          Players.setDeadState(data.id, true);
        }
        break;
      case 'bubble-chat':
        data.message = FilterdWordList.filterStrMemorized(data.message);
        Players.displayChatBubble(data);
        break;
      case 'connection-success': {
        console.log('#### connection-success ', data);
        Alchemicas.updatePlayerWallet(data.playerWallet);

        await Players.onPlayerSocketInit(data);

        runGarbageCollector();
        AnimationsController.playObjectsAnim();
        if (GameController.MAP === 'aarena') {
          GlobalState.REALM.dispatch({
            type: 'UPDATE_AARENA_QUEUE',
            aarenaQueue: { state: true },
          });
        }
        GlobalState.PHASER.dispatch({
          type: 'UPDATE_CONNECTED',
          connected: true,
        });
        GlobalState.REALM.dispatch({
          type: 'UPDATE_PLAYERS_HEALTH',
          health: data.health,
        });
        GlobalState.REALM.dispatch({
          type: 'UPDATE_WEAPON_TYPES',
          leftWeapon: data.leftWeapon,
          rightWeapon: data.rightWeapon,
        });
        GlobalState.REALM.dispatch({
          type: 'UPDATE_USER_TRAITS',
          userTraits: {
            alchemicaCarryingCapacity: data.traits?.alchemicaCarryingCapacity,
            maxHealth: data.traits?.maxHealth,
            ap: data.traits?.ap,
            maxAP: data.traits?.maxAP,
            defense: data.traits?.defense,
            evasion: data.traits?.evasion,
            luck: data.traits?.luck,
            speed: data.traits?.attackSpeed,
            melee: Math.round(data.traits?.meleePower),
            range: data.traits?.rangedPower,
            regen: data.traits?.healthRegenAmount,
            apRegenAmount: data.traits?.apRegenAmount,
            healthRegenAmount: data.traits?.healthRegenAmount,
          },
          userTraitsBases: {
            alchemicaCarryingCapacity: data.traitsBases?.alchemicaCarryingCapacity,
            maxHealth: data.traitsBases?.maxHealth,
            ap: data.traitsBases?.ap,
            maxAP: data.traitsBases?.maxAP,
            defense: data.traitsBases?.defense,
            evasion: data.traitsBases?.evasion,
            luck: data.traitsBases?.luck,
            speed: data.traitsBases?.attackSpeed,
            melee: data.traitsBases?.meleePower,
            range: data.traitsBases?.rangedPower,
          },
          userWearableTraitBonuses: {
            alchemicaCarryingCapacity: data.wearableTraitBonuses?.alchemicaCarryingCapacity,
            maxHealth: data.wearableTraitBonuses?.maxHealth,
            ap: data.wearableTraitBonuses?.ap,
            maxAP: data.wearableTraitBonuses?.maxAP,
            defense: data.wearableTraitBonuses?.defense,
            evasion: data.wearableTraitBonuses?.evasion,
            luck: data.wearableTraitBonuses?.luck,
            speed: data.wearableTraitBonuses?.attackSpeed,
            melee: Math.round(data.wearableTraitBonuses?.meleePower),
            range: data.wearableTraitBonuses?.rangedPower,
            regen: data.wearableTraitBonuses?.healthRegenAmount,
            apRegenAmount: data.wearableTraitBonuses?.apRegenAmount,
            healthRegenAmount: data.wearableTraitBonuses?.healthRegenAmount,
          },
        });

        // Init & assign userQuickslots
        if (_.has(data, 'quickslots')) {
          GlobalState.REALM.dispatch({
            type: 'UPDATE_USER_QUICKSLOTS',
            userQuickslots: data.quickslots,
          });
        }

        // INIT Garbage collector based on gameObject types.
        // addIntervalAction('missilesGarbageCollector', garbageCollector('missiles'), { delay: 3, complete: true });

        break;
      }
      case 'zone-transfer': {
        const action = data?.action;
        if (action === 'start') {
          socketConnect(selectedPlayer, data, 'transfer').catch(() => {
            abortSocketTransfer();
          });
        } else if (action === 'completed') {
          // when our second open socket confirms the connection is transferred cleanly close the first
          socket.onerror = null;
          socket.onclose = null;
          socket.close();
          // and make the transfer socket the main socket
          socket = transferSocket;
          transferSocket = null;
          broadcastSocketChange(socket);
        } else if (action === 'failed') {
          abortSocketTransfer();
        }
        break;
      }

      case 'enemy': {
        Enemies.triggerAction(data.data);
        break;
      }
      case 'game-actions':
        handleGameActions(data);
        break;
      case 'death':
        // console.log('death', data);
        GlobalState.UI.dispatch({
          type: 'UPDATE_EXIT_ARENA_MODAL',
          exitArenaModal: {
            open: true,
            isDead: true,
            respawnDelay: data.respawnDelay,
            attackerId: data.attackerId,
            attackerName: data.attackerName,
            damageType: data.damageType,
            deathTime: data.deathTime,
          },
        });
        break;
      case 'respawn':
        GlobalState.UI.dispatch({
          type: 'UPDATE_EXIT_ARENA_MODAL',
          exitArenaModal: {
            open: false,
            isDead: false,
          },
        });

        // Players.setDeadState(Players.selectedPlayer.id, false);
        break;
      case 'alert':
        if (data?.host) {
          GlobalState.PHASER.dispatch({
            type: 'UPDATE_HOST',
            host: data.host,
          });
          return;
        }
        handleToastNotification(data);
        break;
      case 'beta-command-response':
        if (data?.indexOf?.('Realm Server Version') !== -1) {
          data += `Realm Client Version: ${version}`;
        }
        console.log('beta-command-response:\r\n', data);
        break;
      // case "voice_chat":
      //     ChatManager.hadleVoiceEvent(data);
      //     break;
      case 'err':
        console.log('err', data);
        toast.error(`Socket Error: ${data}`, { theme: 'dark' });
        console.warn('socket.onmessage err', data);
        break;
      default:
        console.warn('socket.onmessage unknown message', message);
        break;
    }
  };

  // this will get triggered on error with initial connection as well on disconnects
  targetSocket.onclose = (e) => {
    console.log('targetSocket:onclose', targetSocket);
    //  = readyStatyses[targetSocket.readyState];
    Installations.isActive = false;

    GlobalState.PHASER.dispatch({
      type: 'UPDATE_SOCKET_CONNECTED',
      socketConnected: false,
    });
    // if socket has already been destroyed a new one has already been created, do nothing
    if (targetSocket.readyState !== 3) return;
    // Handle disconnect

    GlobalState.PHASER.dispatch({
      type: 'UPDATE_CONNECTED',
      connected: false,
    });

    GlobalState.UI.dispatch({
      type: 'UPDATE_AALTAR_DIALOGUE',
      aaltarDialogueState: {
        open: false,
        altarId: undefined,
        realmId: undefined,
      },
    });
    GlobalState.UI.dispatch({
      type: 'UPDATE_PARCEL_DASHBOARD',
      parcelDashboardState: {
        open: false,
        altarId: undefined,
      },
    });
    GlobalState.UI.dispatch({
      type: 'UPDATE_HUD',
      hud: 'PLAY',
    });
    GlobalState.CHAT.dispatch({ type: 'CLEAR_CHAT_EVENTS' });
    GlobalState.REALM.dispatch({ type: 'UPDATE_CURRENT_DISTRICT', currentDistrict: undefined });
    unsubscribeToChatChannels();

    SFXController.clearSpatial();

    if (isDev) console.warn('Socket closed!');

    // kill any queued toast notifications
    toast.clearWaitingQueue();
    // if the user was previously connected this flag will be true
    if (wasConnected) {
      // clear the stage on a reconnect as all data will be resent on reconnect
      clearDynamicData();
    }

    // dev env tries reconnect indefinitely
    let allowReconnectAttempt = !scene.unrecoverableSocketError && reconnectAttemptNum < 30;
    // do not run auto-reconnect on disconect if the browser tab is in the background
    if (document.visibilityState === 'hidden' && !isDev) {
      allowReconnectAttempt = false;
    }
    const isOnPlayPage = Router.route === getGameRoute();
    let reconnectMsg = wasConnected ? 'Reconnecting to REALM' : 'Connecting to REALM';
    // adding trailing dots at the end of the reconnect msg every time a connection is attempted
    reconnectMsg += Array(reconnectAttemptNum + 1).join('.');
    if (allowReconnectAttempt && isOnPlayPage) {
      handleToastNotification({
        message: reconnectMsg,
        autoClose: false,
        type: 'info',
      });
      // retry occurs at 2s intervals. After ~60s, we send back to landing page
      const retryTimeMs = 3000;
      reconnectAttemptNum++;
      console.log(`Socket is closed. Reconnect #${reconnectAttemptNum} will be attempted in ${retryTimeMs}ms.`, e.reason);
      if (socketRetryTimer) clearTimeout(socketRetryTimer);

      socketRetryTimer = setTimeout(() => {
        const isOnPlayPage = Router.route === getGameRoute();
        // we need to check router again here to not have concurrency issues.
        // do not retry on local since hotreload can trigger multiple connect attempts
        if (!isOnPlayPage || GlobalState.PHASER.state.socketConnected) return clearTimeout(socketRetryTimer);
        socketConnect(selectedPlayer, null, 'reconnect').catch(() => {
          // failed, wait for retry
        });
      }, retryTimeMs);
    } else {
      // if it's an unrecoverableSocketError it'll have it's own alert
      if (!scene.unrecoverableSocketError) {
        // clear previous sticky toast notifications
        if (stickyToastAlertId) {
          toast.dismiss(stickyToastAlertId);
        }
        // an intentional close like hitting the power button to leave game should not display this error message
        const wasIntentionalClose = wasConnected && e.wasClean && e.code === 1005;
        if (!wasIntentionalClose) {
          handleToastNotification({
            message: wasConnected ? 'Lost the connection to REALM. Please log in again.' : "Couldn't connect to REALM. Please try again",
            autoClose: true,
            type: 'warn',
          });
        }
      }
      // other users have likely also been reset
      if (isOnPlayPage) void Router.push('/');
      clearInterval(garbageCollectorTick);
    }
  };

  targetSocket.onerror = function (err) {
    // socket error most commonly occurs when the server is down or not available
    // in that case lets consider this not unrecoverable, the reconnect logic will kick in with socket.close()
    // scene.unrecoverableSocketError = process.env.APP_ENV !== 'development';
    // handleToastNotification({
    //   message: 'Error connecting to REALM. Try refreshing your browser to try again.',
    //   autoClose: false,
    //   type: 'error',
    // });
    console.error('Socket encountered error: ', err, 'Closing socket');
    targetSocket.close();
  };

  Router.events.on('routeChangeStart', (url) => {
    if (targetSocket.readyState === 1) targetSocket.close();
  });
}

// change to rounteChangeStart instead of rounteChnageComplete

const handleGameActions = (gameActions: { action: string; data: any }) => {
  // console.log('game', gameActions);
  const { action, data } = gameActions;
  switch (action) {
    case 'combat-exit':
      if (data) {
        GlobalState.UI.dispatch({
          type: 'UPDATE_EXIT_ARENA_MODAL',
          exitArenaModal: {
            open: true,
            isDead: false,
            exitData: data,
          },
        });
      }

      break;
    case 'tip': {
      // const tipResultStr = `DEBUG: TIP ATTEMPT ${data.tipId} response received: ${JSON.stringify(data)}`;
      // console.log(tipResultStr);
      if (data.status === 'failed') {
        handleToastNotification({
          message: data.error,
          autoClose: true,
          type: 'warn',
        });
      }
      break;
    }

    // STORE/ITEM SHOP
    case 'store-purchase': {
      // update last store purchase state on global state
      GlobalState.UI.dispatch({
        type: 'UPDATE_ITEM_SHOP_STATE',
        itemShopState: { purchaseStatus: data },
      });
      break;
    }

    case 'item-use': {
      handleItemUse(data);
      break;
    }
    case 'toggle-fe-tests': {
      // run FE tests
      const action = !ENABLE_TESTS;
      ENABLE_TESTS = action;

      // Enemies only for the moment;
      Enemies.runTests(action);
      break;
    }
    case 'respawn-buyback': {
      console.log('respawn-buyback', data);
      if (data.status === 'success') {
        GlobalState.UI.dispatch({
          type: 'UPDATE_EXIT_ARENA_MODAL',
          exitArenaModal: {
            open: false,
            isDead: false,
          },
        });
      } else if (data.status === 'failed') {
        GameController.handleToastNotification({
          message: data.error,
          type: 'warn',
          autoClose: true,
        });
      }
      break;
    }
    // QUICKSLOTS
    case 'quickslot-update': {
      setQuickslotUpdate(data);
      break;
    }

    default:
      console.warn(`handleGameActions: unknown action: ${action}, data:`, data);
      break;
  }
};

const handleItemUse = (data: ItemUse): void => {
  switch (data.status) {
    case 'pending':
      // Dd nothing for now, just wait for final status
      break;
    case 'success':
      // oh yah, we used some items hookup items based on item type.
      const item = shopItemsById[data.itemId];
      const now = Date.now();
      if (item.type === 'potion') Potions.consume({ gotchiId: data.gotchiId, id: data.itemId });
      // update quickslot only on selected player
      if (!Players.isSelectedPlayer(data.gotchiId) || !data.quantityRemaining) return;
      setQuickslotUpdate({
        gotchiId: data.gotchiId,
        updatesByIndex: {
          [data.quickslotIndex]: { lastUse: now, quantity: data.quantityRemaining },
        },
      });
      break;
    case 'failed':
      // oh yah, we used some items hookup items based on item type.
      if (!data.error) return;
      GameController.handleToastNotification({
        message: data.error,
        type: 'error',
        autoClose: true,
      });
      break;

    default:
      break;
  }
};

function broadcastSocketChange(socket) {
  GlobalState.UI.dispatch({
    type: 'UPDATE_SOCKET',
    socket: socket,
  });
  GlobalState.CHAT.dispatch({
    type: 'UPDATE_SOCKET',
    socket: socket,
  });
}

function abortSocketTransfer() {
  // toast.info('There was an error transferring your connection. Trying again...', { theme: 'dark' });
  if (transferSocket) {
    transferSocket.onerror = null;
    transferSocket.onclose = null;
    transferSocket.close();
    transferSocket = null;
  }

  // manually close the original connection, it will auto establish a new conection
  if (socket) socket.close();
}

function handleToastNotification(data): void {
  // message may be passed as false to unset a system message
  if (Object.prototype.hasOwnProperty.call(data, 'message')) {
    const autoClose = Object.prototype.hasOwnProperty.call(data, 'autoClose') ? data.autoClose : true;
    const isStickySystemMessage = autoClose === false;
    // read-once re-occuring system messsaes will include a cookieId, once closed it will be checked to not come up again wtih the same message
    const cookieId = data?.cookieId;
    // if a message contains a link on close
    const link = data?.link;
    let onClose = (!link ? null : async () => await Router.push(link)) as any;
    if (!onClose && cookieId) {
      onClose = () => {
        localStorage.setItem(`last-read-message-type-${cookieId}`, data.message);
      };
    }

    if (stickyToastAlertId && isStickySystemMessage && toast.isActive(stickyToastAlertId)) {
      // if a new sticky system message is coming up
      // and an existing one already exists, just update the content in it
      // toast.dismiss(stickyToastAlertId);
      if (data.message) {
        toast.update(stickyToastAlertId, {
          theme: 'dark',
          render: data.message,
          type: 'success',
          closeButton: !autoClose,
          onClose,
        });
      } else {
        // special case of passing an empty message to clear previous sticky
        toast.dismiss(stickyToastAlertId);
        stickyToastAlertId = null;
      }
      // if it's a temporary notification (not sticky) and this browser tab is in background we don't display the message
      // this is because background tabs will just queue all allerts and display them when resuming the tab
      // which is ugly and not useful
    } else if ((!autoClose || (autoClose && document.visibilityState !== 'hidden')) && data.message) {
      const toastConfig = {
        theme: 'dark',
        autoClose: autoClose,
        closeButton: !autoClose,
        onClose,
      } as any;
      if (data.customToastClass) {
        toastConfig.className = data.customToastClass;
      }
      const newToastId = toast[data.type || 'info'](`${data.message}`, toastConfig);
      if (isStickySystemMessage) {
        stickyToastAlertId = newToastId;
      }
    }
  } else {
    console.warn('socket.onmessage malformed alert', data.message);
  }
}

// this is called when a player is respawning or re-connecting to clear the map of dynamic content before being reinitalized with socket data
function clearDynamicData() {
  // console.log('clearDynamicData....');
  Players.removePlayers([]);
  Alchemicas.destroyAll();
  Potions.destroyAll();
  Enemies.destroyAll();
  Parcels.destroyAll([]);
  Installations.destroyAll();
  Missiles.destroyAll();
}

// avoid socket idletimeout of around 30 seconds by sending a 'ping' event every 30 seconds of inactivity
function sendData(channel: string, action: string | null, data): void {
  if (isColyseusNetcode()) {
    if (channel === 'ping') {
      colyseusSendPing();
      return;
    }
    if (channel === 'combat') {
      if (action === 'melee' || action === 'fire') {
        // Citaadel /play has no Colyseus combat — ignore quietly (legacy SHOOT_MODE still arms clicks).
        if (GameController.MAP !== 'aarena') return;
        const ok = colyseusSendCombat(action, data);
        if (!ok) {
          console.warn('@sendData combat dropped — not on aarena Colyseus room', {
            map: GameController.MAP,
            colyseusConnected: colyseusIsConnected(),
          });
          handleToastNotification({
            message: 'Combat not connected. Re-enter the Aarena (REALM server must be running).',
            autoClose: true,
            type: 'error',
          });
        }
      }
      return;
    }
    // RH aarena: hotkey alchemica drop → SIM NVDA pocket (server gated by RH_TEST_DROP_ENABLED).
    if (channel === 'game-actions' && action === 'token-drop') {
      const token = String(data?.token || 'nvda');
      if (!colyseusSendTestDrop(token)) {
        console.warn('@sendData token-drop ignored — not on aarena-rh');
      }
      return;
    }

    if (channel === 'movement') {
      const payload = action ? data?.data || data : data;
      if (action === 'teleport') {
        const parcelId = String(payload?.parcelId || data?.parcelId || '');
        if (parcelId) void colyseusTeleportToParcel(parcelId);
        return;
      }
      if (action === 'keys' || payload?.direction !== undefined) {
        colyseusHandleKeyMove(payload?.direction, Boolean(payload?.isSprint));
        return;
      }
      const position = payload?.position || payload?.data?.position;
      if (position && typeof position.x === 'number' && typeof position.y === 'number') {
        // Click-to-move / mouse path
        colyseusHandleKeyMove('none', false);
        colyseusSendMove(position.x, position.y);
      }
      return;
    }
    // Other legacy channels are no-ops in the walkable Colyseus MVP
    return;
  }

  if (action) data = { action, data };
  // send the timestamp that each msg was sent
  if (socket?.readyState === 1) {
    data.sent = Date.now();
    // console.log(`SendData to socket ${socket.zoneId} channel: "${channel}" action: "${action}" data: ${JSON.stringify(data)}`);
    socket.emit(channel, data);
  }
}

function sendPing() {
  if (isColyseusNetcode()) {
    if (colyseusIsConnected()) {
      colyseusSendPing();
      Performance.start('ping');
    } else {
      clearInterval(idleTimer);
    }
    return;
  }

  if (socket.readyState === 1) {
    // console.log('ping server');
    sendData('ping', null, {});
    Performance.start('ping');
  } else {
    clearInterval(idleTimer);
  }
}

async function handleLoginQueueUpdate(queueUpdate: QueueUpdate) {
  // console.log('@handleLoginQueueUpdate:queueUpdate', queueUpdate);
  GlobalState.REALM.dispatch({
    type: 'UPDATE_AARENA_QUEUE',
    aarenaQueue: { state: true, status: queueUpdate.status, meta: queueUpdate.meta },
  });
  switch (queueUpdate.status) {
    case 'queued':
      // Player hit the Queue, buy some popcorn, time to watch the show..
      if (GameController.MAP === 'aarena') {
        GlobalState.REALM.dispatch({
          type: 'UPDATE_AARENA_QUEUE',
          aarenaQueue: { state: true, status: queueUpdate.status, meta: queueUpdate.meta },
        });

        await MapController.initMap();
        const cameraSettings = getDefaultCameraSettings();
        scene.cameras.main.setZoom(cameraSettings.zoom).setBounds(cameraSettings.left, 0, cameraSettings.right, cameraSettings.height);
      } else {
        handleToastNotification({
          message: queueUpdate.message,
          autoClose: false,
          type: 'success',
        });
      }
      break;
    case 'approved':
      if (GameController.MAP === 'aarena') {
        // Oh yeah, time to fight!!
      } else {
        toast.dismiss(stickyToastAlertId);
        stickyToastAlertId = null;
      }
      break;
    case 'aborted':
      void Router.push('/');
      handleToastNotification({
        message: 'Sorry fren, something went wrong!',
        autoClose: true,
        type: 'error',
      });
      break;
    default:
      console.error('@handleLoginQueueUpdate: oops unknown queue status:', queueUpdate.status);
      break;
  }
}

const toggleShooting = (state: boolean): void => {
  scene.loadedPlayerIds.forEach((id) => {
    Players.toggleHealthBar(id, state, state ? DEFAULT_GOTCHI_PROPERTIES.health : 0);
  });
  // toggle shooting button
  GlobalState.PHASER.dispatch({
    type: 'UPDATE_GAME_SHOOTING',
    gameShooting: state,
  });
};

const getGameRoute = (): '/combat' | '/play' => {
  return GameController.MAP === 'aarena' ? '/combat' : '/play';
};

// any global game config variable changes that differ from compiled GAME_CONFIG will be pushed here on socket connect
// any run-time changes like via betaAdminCommands will also be pushed here during live player connections
const handleGameConfigUpdate = (gameConfigUpdateObj) => {
  if (!gameConfigUpdateObj || _.isEmpty(gameConfigUpdateObj)) {
    return;
  }
  console.log('@HandleGameConfigUpdate', gameConfigUpdateObj);

  GlobalState.GAME.dispatch({
    type: 'UPDATE_GAME_CONFIG',
    gameConfig: gameConfigUpdateObj,
  });

  // checking this way because these values can be boolean false
  const changedGameMode =
    _.has(gameConfigUpdateObj, 'miniGameMode') && gameConfigUpdateObj.miniGameMode !== GlobalState.GAME.state.gameConfig.miniGameMode;

  const changedRoundActive =
    _.has(gameConfigUpdateObj, 'miniGameRoundActive') &&
    gameConfigUpdateObj.miniGameRoundActive !== GlobalState.GAME.state.gameConfig.miniGameRoundActive;

  const miniGameTimeLeftChange =
    _.has(gameConfigUpdateObj, 'miniGameTimeLeft') && gameConfigUpdateObj.miniGameTimeLeft !== GlobalState.GAME.state.gameConfig.miniGameTimeLeft;

  const changedPinnedNotification =
    _.has(gameConfigUpdateObj, 'pinnedAlert') && gameConfigUpdateObj.pinnedAlert !== GlobalState.GAME.state.gameConfig.pinnedAlert;

  const minigamePrestartChanged =
    _.has(gameConfigUpdateObj, 'miniGamePrestartTrigger') &&
    gameConfigUpdateObj.miniGamePrestartTrigger !== GlobalState.GAME.state.gameConfig.miniGamePrestartTrigger;

  const changedAllowUnlimitedZoomOut =
    _.has(gameConfigUpdateObj, 'allowUnlimitedZoomOut') &&
    gameConfigUpdateObj.allowUnlimitedZoomOut !== GlobalState.GAME.state.gameConfig.allowUnlimitedZoomOut;

  // const changedAOI = _.has(gameConfigUpdateObj, 'aoiColCount');

  const changedEnableQuestHint =
    _.has(gameConfigUpdateObj, 'enableQuestHint') && gameConfigUpdateObj.enableQuestHint !== GlobalState.GAME.state.gameConfig.enableQuestHint;

  const changedSpin =
    _.has(gameConfigUpdateObj, 'spinDuration') && gameConfigUpdateObj.spinDuration !== GlobalState.GAME.state.gameConfig.spinDuration;

  const changedCombatLive =
    _.has(gameConfigUpdateObj, 'combatIsLive') && gameConfigUpdateObj.combatIsLive !== GlobalState.GAME.state.gameConfig.combatIsLive;

  // we don't have to explicitly set changes to mapConfig as they'll get merged here
  _.assign(GlobalState.GAME.state.gameConfig, gameConfigUpdateObj);

  if (changedCombatLive) {
    // Combat is changed open Aarena gates
    GlobalState.GAME.state.gameConfig.combatIsLive = gameConfigUpdateObj.combatIsLive;
    Pads.toggleAarena(GlobalState.GAME.state.gameConfig.combatIsLive);
  }

  if (changedSpin) {
    // Flush these animations from cache so they can be recreated with the new duration
    scene.anims.remove('spin_0');
    scene.anims.remove('spin_1');
    scene.anims.remove('spin_2');
    scene.anims.remove('spin_3');
  }

  if (changedEnableQuestHint) Quests.toggleHint(gameConfigUpdateObj.enableQuestHint);

  if (miniGameTimeLeftChange) {
    let timeLeft;

    if (GlobalState.GAME.state.gameConfig.miniGameTimeLeft) {
      timeLeft = GlobalState.GAME.state.gameConfig.miniGameTimeLeft;
    } else {
      timeLeft = GlobalState.GAME.state.gameConfig.miniGameAutoStartInterval
        ? GlobalState.GAME.state.gameConfig.miniGameAutoStartInterval * 60 - GlobalState.GAME.state.gameConfig.miniGameRoundDuration - 3
        : 0;
    }

    GlobalState.PHASER.dispatch({
      type: 'UPDATE_ROUND_TIME',
      roundTime: timeLeft,
    });

    // Last Enemy kill trigger an automatic stop-round
    // if (GlobalState.GAME.state.gameConfig.miniGameTimeLeft === 10) {
    //   MinigameController.playRoundAnim(false);
    // }
  }

  if (changedGameMode) MinigameController.onModeChange();

  if (Object.prototype.hasOwnProperty.call(gameConfigUpdateObj, 'miniGameAutoStartInterval')) {
    // If player enters until next round
    let timeLeft;
    if (Object.prototype.hasOwnProperty.call(gameConfigUpdateObj, 'miniGameNextRoundStartTimestamp')) {
      const now = Date.now();
      // calculate seconds left till next round
      timeLeft = Math.floor((gameConfigUpdateObj.miniGameNextRoundStartTimestamp + 3000 - now) / 1000);
      // console.log('miniGameNextRoundStartTimestamp', timeLeft);
    }
    if (!GlobalState.GAME.state.gameConfig.miniGameRoundActive) {
      GlobalState.PHASER.dispatch({
        type: 'UPDATE_ROUND_TIME',
        roundTime: timeLeft || gameConfigUpdateObj.miniGameAutoStartInterval * 60,
      });
    }
  }

  if (changedPinnedNotification) {
    const cookieId = 'global-pinned';
    const lastReadGlobalPin = localStorage.getItem(`last-read-message-type-${cookieId}`);
    if (lastReadGlobalPin !== GlobalState.GAME.state.gameConfig.pinnedAlert || !GlobalState.GAME.state.gameConfig.pinnedAlert) {
      handleToastNotification({
        message: GlobalState.GAME.state.gameConfig.pinnedAlert,
        type: 'info',
        autoClose: false,
        cookieId,
      });
    }
  }

  if (minigamePrestartChanged) {
    if (GlobalState.GAME.state.gameConfig.miniGamePrestartTrigger) {
      // new minigame round pre-start trigger just fired
      // round will begin in 3s
      MinigameController.playRoundAnim(true);
      if (Players.mouseUpdateInterval) {
        clearInterval(Players.mouseUpdateInterval);
      }
    }
  }

  if (changedAllowUnlimitedZoomOut) {
    toggleUnlimitedZoomOut(GlobalState.GAME.state.gameConfig.allowUnlimitedZoomOut);
  }

  if (changedRoundActive) {
    MinigameController.onRoundChange();
  }
};

// any map level config variable changes that differ from compiled MAP_CONFIG_BY_ID will be pushed here on socket connect
// any run-time map config changes like via betaAdminCommands will also be pushed here during live player connections
const handleMapConfigUpdate = (mapConfigUpdateObj) => {
  if (!mapConfigUpdateObj) {
    return;
  }
  const mapConfig = scene.mapConfig;
  const shootModeChanged =
    Object.prototype.hasOwnProperty.call(mapConfigUpdateObj, 'SHOOT_MODE') && mapConfig.SHOOT_MODE !== mapConfigUpdateObj.SHOOT_MODE;

  const changedPinnedNotification =
    Object.prototype.hasOwnProperty.call(mapConfigUpdateObj, 'PINNED_ALERT') && mapConfig.PINNED_ALERT !== mapConfigUpdateObj.PINNED_ALERT;

  // we don't have to explicitly set changes to mapConfig as they'll get merged here
  _.assign(mapConfig, mapConfigUpdateObj);

  if (shootModeChanged) {
    toggleShooting(Boolean(mapConfig.SHOOT_MODE));
  }

  if (shootModeChanged) {
    InputController.updateShootMode(mapConfig.SHOOT_MODE);
  }

  if (changedPinnedNotification) {
    const cookieId = 'map-pinned';
    const lastSavedMapPin = localStorage.getItem(`last-read-message-type-${cookieId}`);
    if (lastSavedMapPin !== mapConfigUpdateObj.PINNED_ALERT || !mapConfigUpdateObj.PINNED_ALERT) {
      handleToastNotification({
        message: mapConfigUpdateObj.PINNED_ALERT,
        type: 'info',
        autoClose: false,
        cookieId,
      });
    }
  }
};

let actions = {};

export interface IntervalCofig {
  complete: boolean; // requirement to end loop
  delay: number; // execute seconds
  max?: number; // max time of execs, if 0 or undefined  there's no limit
}

const addIntervalAction = (key: string, action: Promise<boolean> | boolean, config: IntervalCofig): void => {
  if (!actions[key]) {
    actions[key] = {};
    actions[key].action = action;
    actions[key].config = config;
    actions[key].executeCounter = 0;
    actions[key].delayCounter = 0;
  }
  void runActions();
};

let gameTick;
const runActions = async () => {
  if (gameTick) return;
  gameTick = setInterval(() => {
    // console.log('actions', actions);
    if (!_.values(actions)?.length) clearInterval(gameTick);
    _.each(_.keys(actions), async (key) => {
      const config = actions[key].config;
      actions[key].delayCounter++;

      const execute = !config.delay || config.delay === actions[key].delayCounter;
      if (!execute) return;
      // console.log('ExecuteAction:', key);

      const res = await actions[key].action;

      actions[key].executeCounter++;
      actions[key].delayCounter = 0;

      if (res === config.complete || (config?.max && actions[key].executeCounter === config.max)) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete actions[key];
      }
    });

    if (Router.route === '/') actions = {};
  }, 1000);
};

let garbageCollectorTick;

const garbageCollectorConfig = {
  missiles: {
    delay: 1, // seconds till execute
    counter: 0,
    defaultLifespan: 3, // max limit in seconds before an object needs to be destroyed
  },
};

const runGarbageCollector = () => {
  if (garbageCollectorTick) return;
  garbageCollectorTick = setInterval(() => {
    if (!scene) {
      clearInterval(garbageCollectorTick);
      return;
    }

    // execute garbageCollector for key
    _.each(_.keys(garbageCollectorConfig), (key) => {
      // try {
      const config = garbageCollectorConfig[key];
      if (!config) return;

      if (config.delay >= config.counter) {
        // increase counter until we meet the number of seconds till execute time
        config.counter++;
        return;
      }

      const group = scene?.[key];
      if (!group) return;

      const now = Date.now();
      // console.log('@GarbageCollector:Type', key, group, now);

      group.forEach((object) => {
        // console.log('@GarbageCollector:OBJ', key, object);
        const created = object.getData('created');
        const lifespan = object.getData('lifespan') || config.defaultLifespan;
        const current = (now - created) / 1000;
        if (current >= lifespan) object.destroy();
      });

      config.counter = 0;
    });
    if (Router.route === '/') {
      clearInterval(garbageCollectorTick);
      clearInterval(scene.continuousFireInterval);
    }
  }, 3000);
};

const GameController: GameControllerInterface = {
  MAP,
  socketConnect,
  sendData,
  handleToastNotification,
  updateSpawnId,
  updateMapType,
  toggleShooting,
  getGameRoute,
  addIntervalAction,
  version,
};

export default GameController;
