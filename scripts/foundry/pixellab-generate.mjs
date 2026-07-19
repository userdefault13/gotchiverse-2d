#!/usr/bin/env node
/**
 * PixelLab.ai Foundry art generator.
 * Requires PIXELLAB_API_TOKEN. Counts every successful API image against the 500 budget.
 *
 * Usage:
 *   PIXELLAB_API_TOKEN=... node scripts/foundry/pixellab-generate.mjs
 *   PIXELLAB_API_TOKEN=... node scripts/foundry/pixellab-generate.mjs --bucket nodes
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const BUDGET_FILE = path.join(ROOT, 'docs/foundry-pixellab-budget.md');
const OUT_SHEETS = path.join(ROOT, 'public/animations/spritesheets/foundry');
const OUT_INSTALL = path.join(ROOT, 'public/animations/installations/foundry');
const API = 'https://api.pixellab.ai/v2/create-image-pixflux';
const HARD_CAP = 500;

const TOKEN = process.env.PIXELLAB_API_TOKEN || process.env.PIXEL_LAB_API_KEY || process.env.PIXELLAB_TOKEN;
if (!TOKEN) {
  console.error('Missing PIXELLAB_API_TOKEN — local placeholder sheets remain in public/animations/*/foundry/');
  process.exit(1);
}

const BUCKETS = {
  nodes: [
    { file: 'foundry_yield_node.png', dir: OUT_SHEETS, description: 'top-down pixel art alchemica vein node in lush green yield fields, glowing gold crystal, 64x64 game sprite, transparent background, gotchiverse frenly style' },
    { file: 'foundry_desert_node.png', dir: OUT_SHEETS, description: 'top-down pixel art satellite dish salvage node in sandy defi desert, cyan dish, transparent background, 64x64 gotchiverse style' },
  ],
  antennas: [
    { file: 'foundry_antenna.png', dir: OUT_SHEETS, description: 'top-down pixel art tesla antenna relay tower, cyan powered glow, transparent background, 64x64 gotchiverse' },
    { file: 'foundry_receiver.png', dir: OUT_SHEETS, description: 'top-down pixel art citaadel wall receiver dish purple and gold, transparent background, 64x64 gotchiverse' },
  ],
  machines: [
    { file: 'foundry_sparkworks.png', dir: OUT_INSTALL, description: 'top-down pixel art alchemica sparkworks power plant, orange glow, transparent, 64x64 gotchiverse' },
    { file: 'foundry_coreforge.png', dir: OUT_INSTALL, description: 'top-down pixel art coreforge CPU maker machine cyan presses, transparent, 64x64 gotchiverse' },
    { file: 'foundry_remembrane.png', dir: OUT_INSTALL, description: 'top-down pixel art remembrane mill memory weaver purple, transparent, 64x64 gotchiverse' },
    { file: 'foundry_callspire.png', dir: OUT_INSTALL, description: 'top-down pixel art callspire RPC spire with antenna brain, cyan, transparent, 64x64 gotchiverse' },
  ],
  faction: [
    { file: 'foundry_linkbreaker.png', dir: OUT_SHEETS, description: 'top-down pixel art desert link-breaker lickquidator scout enemy red, transparent, 64x64 gotchiverse' },
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

## Log

${lines.join('\n')}

## Notes

- Local procedural placeholders do **not** count against the API budget.
- Run \`node scripts/foundry/pixellab-generate.mjs\` with \`PIXELLAB_API_TOKEN\` to replace placeholders.
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
      width: 64,
      height: 64,
      no_background: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PixelLab ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const b64 = data?.image?.base64 || data?.base64 || data?.image;
  if (!b64 || typeof b64 !== 'string') {
    throw new Error(`Unexpected PixelLab response keys: ${Object.keys(data || {})}`);
  }
  const buf = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  fs.mkdirSync(item.dir, { recursive: true });
  fs.writeFileSync(path.join(item.dir, item.file), buf);
}

const bucketArg = process.argv.includes('--bucket') ? process.argv[process.argv.indexOf('--bucket') + 1] : 'nodes';
const jobs = BUCKETS[bucketArg] || BUCKETS.nodes;
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
    log.push(`- KEEP ${item.file} (bucket=${bucketArg})`);
    console.log('ok');
  } catch (e) {
    log.push(`- FAIL ${item.file}: ${e.message}`);
    console.log('fail', e.message);
  }
}

writeBudget(used, log);
console.log(`Budget used: ${used}/${HARD_CAP}`);
