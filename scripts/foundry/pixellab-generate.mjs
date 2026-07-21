#!/usr/bin/env node
/**
 * PixelLab.ai Foundry art generator.
 * Reads PIXELLAB_API_TOKEN (and optional PIXELLAB_API_URL) from env or .env.example.
 * Counts every successful API image against the 500 budget.
 *
 * Usage:
 *   node scripts/foundry/pixellab-generate.mjs --bucket nodes
 *   node scripts/foundry/pixellab-generate.mjs --bucket all
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const BUDGET_FILE = path.join(ROOT, 'docs/foundry-pixellab-budget.md');
const OUT_SHEETS = path.join(ROOT, 'public/animations/spritesheets/foundry');
const OUT_INSTALL = path.join(ROOT, 'public/animations/installations/foundry');
const OUT_RECIPES = path.join(ROOT, 'public/images/foundry/recipes');
const HARD_CAP = 500;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*'([^']*)'\s*$/) || line.match(/^\s*([A-Z0-9_]+)\s*=\s*"([^"]*)"\s*$/) || line.match(/^\s*([A-Z0-9_]+)\s*=\s*([^\s#]+)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnvFile(path.join(ROOT, '.env'));
loadEnvFile(path.join(ROOT, '.env.example'));

const TOKEN = process.env.PIXELLAB_API_TOKEN || process.env.PIXEL_LAB_API_KEY || process.env.PIXELLAB_TOKEN;
const API_BASE = (process.env.PIXELLAB_API_URL || 'https://api.pixellab.ai').replace(/\/$/, '');
const API = `${API_BASE}/v2/create-image-pixflux`;

if (!TOKEN) {
  console.error('Missing PIXELLAB_API_TOKEN — set in .env or .env.example');
  process.exit(1);
}

const STYLE =
  'Gotchiverse frenly top-down pixel art game sprite, readable at 64px, clean outline, transparent background, no text, no UI chrome';

const BUCKETS = {
  nodes: [
    {
      file: 'foundry_yield_node.png',
      dir: OUT_SHEETS,
      description: `${STYLE}, lush green yield fields alchemica vein node with glowing gold crystal cluster`,
    },
    {
      file: 'foundry_desert_node.png',
      dir: OUT_SHEETS,
      description: `${STYLE}, sandy defi desert salvage node with cyan satellite dish`,
    },
  ],
  antennas: [
    {
      file: 'foundry_antenna.png',
      dir: OUT_SHEETS,
      description: `${STYLE}, tesla-style antenna relay tower with cyan powered glow`,
    },
    {
      file: 'foundry_receiver.png',
      dir: OUT_SHEETS,
      description: `${STYLE}, citaadel wall receiver dish in purple and gold`,
    },
  ],
  machines: [
    {
      file: 'foundry_sparkworks.png',
      dir: OUT_INSTALL,
      description: `${STYLE}, alchemica sparkworks power plant with warm orange glow`,
    },
    {
      file: 'foundry_coreforge.png',
      dir: OUT_INSTALL,
      description: `${STYLE}, coreforge CPU maker machine with cyan presses`,
    },
    {
      file: 'foundry_remembrane.png',
      dir: OUT_INSTALL,
      description: `${STYLE}, remembrane mill memory weaver purple spectral frames`,
    },
    {
      file: 'foundry_callspire.png',
      dir: OUT_INSTALL,
      description: `${STYLE}, callspire RPC spire antenna brain cyan beacon`,
    },
  ],
  faction: [
    {
      file: 'foundry_linkbreaker.png',
      dir: OUT_SHEETS,
      description: `${STYLE}, desert link-breaker lickquidator scout enemy red top-down`,
    },
  ],
  ui: [
    { file: 'icon_salvage_antenna.png', dir: OUT_SHEETS, description: `${STYLE}, small cyan antenna salvage icon` },
    { file: 'icon_salvage_dish.png', dir: OUT_SHEETS, description: `${STYLE}, small sand dish salvage icon` },
    { file: 'icon_salvage_slag.png', dir: OUT_SHEETS, description: `${STYLE}, small orange slag fuel icon` },
    { file: 'icon_pulsecore.png', dir: OUT_SHEETS, description: `${STYLE}, small gold pulsecore CPU die icon` },
    { file: 'icon_motebank.png', dir: OUT_SHEETS, description: `${STYLE}, small purple motebank memory icon` },
    { file: 'icon_netherlink.png', dir: OUT_SHEETS, description: `${STYLE}, small cyan netherlink mesh icon` },
    { file: 'icon_walk_ledger.png', dir: OUT_SHEETS, description: `${STYLE}, small green walk ledger scroll icon` },
    { file: 'icon_tithe.png', dir: OUT_SHEETS, description: `${STYLE}, small gold portal tithe coin icon` },
  ],
  recipes: [
    {
      file: 'recipe_antenna_relay.png',
      dir: OUT_RECIPES,
      size: 128,
      description: `${STYLE}, antenna relay tower with cyan mesh dish on sand base, recipe book hero`,
    },
    {
      file: 'recipe_dish_assembly.png',
      dir: OUT_RECIPES,
      size: 128,
      description: `${STYLE}, satellite mesh dish being forged from orange slag sparks, recipe book hero`,
    },
  ],
};

function readBudgetCount() {
  if (!fs.existsSync(BUDGET_FILE)) return 0;
  const m = fs.readFileSync(BUDGET_FILE, 'utf8').match(/API images used:\s*(\d+)/i);
  return m ? Number(m[1]) : 0;
}

function writeBudget(used, lines) {
  const body = `# Foundry PixelLab Budget

Hard cap: **500** images (API generations).

API images used: ${used}

API base: \`${API_BASE}\`

## Log

${lines.join('\n')}

## Notes

- Token/URL loaded from \`.env\` or \`.env.example\` (\`PIXELLAB_API_TOKEN\`, \`PIXELLAB_API_URL\`).
- Run: \`node scripts/foundry/pixellab-generate.mjs --bucket nodes|antennas|machines|faction|ui|recipes|all\`
`;
  fs.mkdirSync(path.dirname(BUDGET_FILE), { recursive: true });
  fs.writeFileSync(BUDGET_FILE, body);
}

async function generateOne(item) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: item.description,
      image_size: { width: item.size || 64, height: item.size || 64 },
      no_background: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PixelLab ${res.status}: ${text.slice(0, 240)}`);
  }
  const data = await res.json();
  const b64 = data?.image?.base64 || data?.base64;
  if (!b64 || typeof b64 !== 'string') {
    throw new Error(`Unexpected PixelLab response keys: ${Object.keys(data || {})}`);
  }
  const buf = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  fs.mkdirSync(item.dir, { recursive: true });
  const outPath = path.join(item.dir, item.file);
  fs.writeFileSync(outPath, buf);

  // Keep Phaser 4-frame sheet compatibility: tile the single frame into 256x64
  if (!item.file.startsWith('icon_')) {
    await writeFourFrameSheet(outPath, buf);
  }
}

/** Duplicate a 64x64 PNG into a horizontal 4-frame sheet for existing loaders. */
async function writeFourFrameSheet(outPath, singlePngBuf) {
  // Prefer sharp if present; else keep single frame file (FoundryNodes uses frame 0).
  try {
    const sharp = (await import('sharp')).default;
    const frame = sharp(singlePngBuf).resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    const { data, info } = await frame.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const sheet = Buffer.alloc(256 * 64 * 4);
    for (let fi = 0; fi < 4; fi++) {
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const src = (y * info.width + x) * 4;
          const dst = (y * 256 + fi * 64 + x) * 4;
          sheet[dst] = data[src];
          sheet[dst + 1] = data[src + 1];
          sheet[dst + 2] = data[src + 2];
          sheet[dst + 3] = data[src + 3];
        }
      }
    }
    await sharp(sheet, { raw: { width: 256, height: 64, channels: 4 } }).png().toFile(outPath);
  } catch {
    // leave single 64x64 png
  }
}

const bucketArg = process.argv.includes('--bucket') ? process.argv[process.argv.indexOf('--bucket') + 1] : 'nodes';
const jobs =
  bucketArg === 'all'
    ? Object.values(BUCKETS).flat()
    : BUCKETS[bucketArg] || BUCKETS.nodes;

let used = readBudgetCount();
const log = [];

for (const item of jobs) {
  if (used >= HARD_CAP) {
    console.error('Hard cap 500 reached — stop');
    break;
  }
  process.stdout.write(`Generating ${item.file}... `);
  try {
    await generateOne(item);
    used += 1;
    log.push(`- KEEP ${item.file} (bucket=${bucketArg}) via ${API_BASE}`);
    console.log('ok');
  } catch (e) {
    log.push(`- FAIL ${item.file}: ${e.message}`);
    console.log('fail', e.message);
  }
}

writeBudget(used, log);
console.log(`Budget used: ${used}/${HARD_CAP}`);
