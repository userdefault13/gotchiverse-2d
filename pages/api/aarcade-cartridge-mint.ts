import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_GAME_ID = 'gotchiverse';
const DEFAULT_TEMPLATE_ID = 'base-starter';
const DEFAULT_CARTRIDGE_SIM_URL = 'https://aarcadeghst.com/api/cartridge-sim';
const DEFAULT_AARCADE_HOME = 'https://aarcadeghst.com';

const SIM_COLLATERAL_IDS = new Set([
  'usdc',
  'dai',
  'weth',
  'aave',
  'link',
  'usdt',
  'wbtc',
  'matic',
  'sushi',
  'yfi',
  'uni',
  'tusd',
  'usdp',
  'frax',
  'lusd',
  'rai',
]);

type MintPhase = 'ensure' | 'bind' | 'bind-owned' | 'bind-rental';

function normalizeWallet(raw: unknown): string | null {
  const wallet = String(raw || '')
    .trim()
    .toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) return null;
  return wallet;
}

function normalizeGameId(raw: unknown): string {
  const gameId = String(raw || DEFAULT_GAME_ID)
    .trim()
    .toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(gameId) ? gameId : DEFAULT_GAME_ID;
}

function normalizePhase(raw: unknown): MintPhase {
  const phase = String(raw || 'ensure')
    .trim()
    .toLowerCase();
  if (phase === 'bind' || phase === 'bind-owned' || phase === 'bind-rental') return phase;
  return 'ensure';
}

function normalizeSourceTokenId(raw: unknown): string | null {
  const id = String(raw || '').trim();
  return /^\d+$/.test(id) ? id : null;
}

/** Map gallery names (aDAI, amWETH, amWMATIC, …) → cartridge-sim collateral ids. */
function toSimCollateralId(raw: unknown): string | null {
  const name = String(raw || '')
    .trim()
    .toLowerCase();
  if (!name) return null;
  if (SIM_COLLATERAL_IDS.has(name)) return name;

  const stripped = name.replace(/^am/, '').replace(/^a/, '');
  const aliases: Record<string, string> = {
    dai: 'dai',
    weth: 'weth',
    aave: 'aave',
    link: 'link',
    usdt: 'usdt',
    usdc: 'usdc',
    tusd: 'tusd',
    uni: 'uni',
    yfi: 'yfi',
    wbtc: 'wbtc',
    wmatic: 'matic',
    matic: 'matic',
    sushi: 'sushi',
  };
  const id = aliases[stripped] || stripped;
  return SIM_COLLATERAL_IDS.has(id) ? id : null;
}

function rosterLen(snapshot: Record<string, unknown> | null): number {
  if (!snapshot) return 0;
  const roster = snapshot.cAavegotchis;
  if (Array.isArray(roster)) return roster.length;
  if (snapshot.cAavegotchi) return 1;
  return 0;
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}

async function createSession(
  sessionUrl: string,
  gameId: string,
  wallet: string,
): Promise<{ sessionToken: string | null; error?: string; status?: number }> {
  const sessionRes = await fetch(sessionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ gameType: gameId, walletAddress: wallet }),
    cache: 'no-store',
  });
  const sessionBody = await readJson(sessionRes);
  if (!sessionRes.ok) {
    return {
      sessionToken: null,
      status: sessionRes.status,
      error: String(sessionBody?.error || 'Failed to create Aarcade game session'),
    };
  }
  const sessionToken = String(sessionBody?.sessionToken || '').trim();
  if (!sessionToken) {
    return { sessionToken: null, status: 502, error: 'game-session returned no sessionToken' };
  }
  return { sessionToken };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = normalizeWallet(req.body?.wallet);
  if (!wallet) {
    return res.status(400).json({ error: 'Invalid wallet' });
  }

  const phase = normalizePhase(req.body?.phase);
  const gameId = normalizeGameId(req.body?.gameId || process.env.NEXT_PUBLIC_AARCADE_CARTRIDGE_GAME_ID);
  const isBtcTrack = gameId === 'gotchiverse-btc' || gameId === 'aarena-btc';

  const needsCollateral = phase === 'bind' || phase === 'bind-owned' || phase === 'bind-rental';
  // Bitcoin soft-launch: only BTC cAavegotchi (wbtc). Ignore other gallery collaterals.
  let collateral = needsCollateral
    ? toSimCollateralId(req.body?.collateral) || (phase === 'bind-owned' ? 'dai' : null)
    : null;
  if (needsCollateral && isBtcTrack) {
    if (phase === 'bind-owned' || phase === 'bind-rental') {
      return res.status(400).json({
        error: 'Bitcoin track only supports minting a BTC cAavegotchi starter (wbtc). L1 bind is Base/RH only.',
        code: 'BTC_ONLY_STARTER',
      });
    }
    collateral = 'wbtc';
  }
  if (needsCollateral && !collateral) {
    return res.status(400).json({
      error: 'Invalid collateral',
      code: 'INVALID_COLLATERAL',
    });
  }

  const sourceTokenId =
    phase === 'bind-owned' || phase === 'bind-rental' ? normalizeSourceTokenId(req.body?.sourceTokenId) : null;
  if ((phase === 'bind-owned' || phase === 'bind-rental') && !sourceTokenId) {
    return res.status(400).json({
      error: 'Invalid sourceTokenId',
      code: 'INVALID_SOURCE_TOKEN',
    });
  }
  const templateId = String(req.body?.templateId || DEFAULT_TEMPLATE_ID).trim() || DEFAULT_TEMPLATE_ID;
  const simPay = req.body?.simPay !== false;

  const aarcadeHome = String(process.env.NEXT_PUBLIC_AARCADE_HOME || DEFAULT_AARCADE_HOME).replace(/\/$/, '');
  const sessionUrl = String(process.env.AARCADE_GAME_SESSION_URL || `${aarcadeHome}/api/game-session`).replace(
    /\/$/,
    '',
  );
  const simBase = String(process.env.AARCADE_CARTRIDGE_SIM_URL || DEFAULT_CARTRIDGE_SIM_URL).replace(/\/$/, '');

  try {
    const session = await createSession(sessionUrl, gameId, wallet);
    if (!session.sessionToken) {
      console.warn('aarcade-cartridge-mint: game-session failed', session.status, session.error);
      return res.status(session.status === 400 ? 400 : 502).json({
        error: session.error || 'Failed to create Aarcade game session',
        code: 'SESSION_FAILED',
      });
    }
    const { sessionToken } = session;

    const ensureRes = await fetch(`${simBase}/cartridges/ensure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ owner: wallet, gameId, sessionToken, simPay }),
      cache: 'no-store',
    });
    const ensureBody = await readJson(ensureRes);
    if (!ensureRes.ok) {
      console.warn('aarcade-cartridge-mint: ensure failed', ensureRes.status, ensureBody);
      return res.status(ensureRes.status >= 400 && ensureRes.status < 500 ? ensureRes.status : 502).json({
        error: String(ensureBody?.error || 'Failed to ensure cartridge'),
        code: String(ensureBody?.code || 'ENSURE_FAILED'),
      });
    }

    const cartridgeId = String(ensureBody?.cartridgeId || '').trim();
    if (!cartridgeId) {
      return res.status(502).json({ error: 'ensure returned no cartridgeId', code: 'ENSURE_FAILED' });
    }

    if (phase === 'ensure') {
      return res.status(ensureRes.status === 201 ? 201 : 200).json({
        ok: true,
        phase: 'ensure',
        alreadyBound: rosterLen(ensureBody) > 0,
        wallet,
        gameId,
        cartridgeId,
        hasCartridge: true,
        cartridge: ensureBody,
      });
    }

    // Pull latest rules (e.g. bindSnapshot: strip) before hero binds.
    try {
      await fetch(`${simBase}/cartridges/${encodeURIComponent(cartridgeId)}/sync-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sessionToken }),
        cache: 'no-store',
      });
    } catch {
      /* non-fatal — bind still proceeds with cartridge rules */
    }

    if (phase === 'bind-owned' || phase === 'bind-rental') {
      const bindPath = phase === 'bind-owned' ? 'bind-owned' : 'bind-rental';
      const bindRes = await fetch(
        `${simBase}/cartridges/${encodeURIComponent(cartridgeId)}/${bindPath}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            sourceTokenId,
            collateral,
            sessionToken,
            simPay,
          }),
          cache: 'no-store',
        },
      );
      const bindBody = await readJson(bindRes);
      if (!bindRes.ok) {
        console.warn(`aarcade-cartridge-mint: ${bindPath} failed`, bindRes.status, bindBody);
        return res.status(bindRes.status >= 400 && bindRes.status < 500 ? bindRes.status : 502).json({
          error: String(bindBody?.error || `Failed to ${bindPath}`),
          code: String(bindBody?.code || 'BIND_FAILED'),
          cartridgeId,
        });
      }
      return res.status(bindBody?.alreadyBound ? 200 : 201).json({
        ok: true,
        phase,
        alreadyBound: Boolean(bindBody?.alreadyBound),
        wallet,
        gameId,
        collateral,
        sourceTokenId,
        cartridgeId: String(bindBody?.cartridgeId || cartridgeId),
        hasCartridge: true,
        cartridge: bindBody,
      });
    }

    // phase === 'bind' (starter)
    if (rosterLen(ensureBody) > 0) {
      return res.status(200).json({
        ok: true,
        phase: 'bind',
        alreadyBound: true,
        wallet,
        gameId,
        collateral,
        cartridgeId,
        hasCartridge: true,
        cartridge: ensureBody,
      });
    }

    const bindRes = await fetch(`${simBase}/cartridges/${encodeURIComponent(cartridgeId)}/bind-starter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        templateId,
        collateral,
        sessionToken,
        simPay,
      }),
      cache: 'no-store',
    });
    const bindBody = await readJson(bindRes);
    if (!bindRes.ok) {
      console.warn('aarcade-cartridge-mint: bind-starter failed', bindRes.status, bindBody);
      return res.status(bindRes.status >= 400 && bindRes.status < 500 ? bindRes.status : 502).json({
        error: String(bindBody?.error || 'Failed to bind starter'),
        code: String(bindBody?.code || 'BIND_FAILED'),
        cartridgeId,
      });
    }

    return res.status(201).json({
      ok: true,
      phase: 'bind',
      alreadyBound: false,
      wallet,
      gameId,
      collateral,
      cartridgeId: String(bindBody?.cartridgeId || cartridgeId),
      hasCartridge: true,
      cartridge: bindBody,
    });
  } catch (err) {
    console.warn('aarcade-cartridge-mint: failed', err);
    return res.status(502).json({ error: 'Cartridge mint request failed', code: 'MINT_FAILED' });
  }
}
