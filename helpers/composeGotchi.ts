/**
 * Offline Aavegotchi composer from the JSON SVG library under /data/.
 * Ported from AavegotchiQuerey `src/utils/composeGotchi.js`.
 * Used for soft-launch cAavegotchi portraits (not wallet L1 gotchis).
 */

export const VIEW_NAMES = ['Front', 'Left', 'Right', 'Back']
export const SLOT_NAMES = [
  'Body',
  'Face',
  'Eyes',
  'Head',
  'Left Hand',
  'Right Hand',
  'Pet',
  'Background'
]

const DATA_BASE = '/data'

let libraryCache = null

/** Coerce trait / numeric field; keep 0 (e.g. mythical eyes) unlike `Number(n) || fallback`. */
export function traitNumber(value: unknown, fallback = 50): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function hexFrom0x(value) {
  if (!value) return '#000000'
  const s = String(value).trim()
  if (s.startsWith('#')) return s
  if (s.startsWith('0x') || s.startsWith('0X')) return `#${s.slice(2)}`
  return `#${s}`
}

/** Eye color trait → fill. Common band uses collateral primary. */
export function getEyeColorHex(eyeColorTrait, primaryColor) {
  const v = Number(eyeColorTrait)
  if (v >= 0 && v <= 1) return '#FF00FF'
  if (v >= 2 && v <= 9) return '#0064FF'
  if (v >= 10 && v <= 24) return '#5D24BF'
  if (v >= 25 && v <= 74) return hexFrom0x(primaryColor)
  if (v >= 75 && v <= 90) return '#36818E'
  if (v >= 91 && v <= 97) return '#EA8C27'
  if (v >= 98 && v <= 99) return '#51FFA8'
  return hexFrom0x(primaryColor)
}

export async function loadLibrary() {
  if (libraryCache) return libraryCache

  const [
    main,
    mainH3,
    collateralsH1,
    collateralsH2,
    collateralsH3,
    eyeShapesH1,
    eyeShapesH2,
    eyeShapesH3,
    wearables,
    rarity
  ] = await Promise.all([
    fetch(`${DATA_BASE}/aavegotchi_db_main.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_main_haunt3.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_collaterals_haunt1.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_collaterals_haunt2.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_collaterals_haunt3.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_eye_shapes_haunt1.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_eye_shapes_haunt2.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_eye_shapes_haunt3.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_wearables.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_rarity.json`).then((r) => r.json()).catch(() => null)
  ])

  libraryCache = {
    main,
    /** Per-haunt body/hands/mouth/eyes/shadow libraries (H3 from rh-gotchi.aseprite). */
    mainByHaunt: {
      1: main,
      2: main,
      3: mainH3,
    },
    collaterals: {
      1: collateralsH1.collaterals || [],
      2: collateralsH2.collaterals || [],
      3: collateralsH3.collaterals || []
    },
    eyeShapes: {
      1: eyeShapesH1.eyeShapes || [],
      2: eyeShapesH2.eyeShapes || [],
      3: eyeShapesH3.eyeShapes || []
    },
    wearables: wearables.wearables || [],
    wearablesById: new Map((wearables.wearables || []).map((w) => [Number(w.id), w])),
    rarity
  }
  return libraryCache
}

/** Body/hands/mouth/eyes/shadow SVG library for a haunt (H3 = RH ase export). */
export function getMainForHaunt(library, hauntId) {
  const hid = Number(hauntId)
  return library.mainByHaunt?.[hid] || library.main
}

export function clearLibraryCache() {
  libraryCache = null
}

export function getCollateralsForHaunt(library, hauntId) {
  return library.collaterals[Number(hauntId)] || []
}

/** Strip ma/am/a prefixes → spirit id (dai, weth, link, wbtc, aave, amazon, …). */
function collateralSpiritKey(nameOrAddr) {
  const raw = String(nameOrAddr || '').trim().toLowerCase()
  if (!raw) return ''
  if (raw.startsWith('0x')) return ''
  // am*/ma* only when remainder is a known aToken spirit — never "amazon" → "azon"
  const aTokens = new Set(['dai', 'weth', 'aave', 'link', 'usdt', 'usdc', 'tusd', 'uni', 'yfi'])
  const isRest = (rest) => aTokens.has(rest) || rest === 'wbtc' || rest === 'wmatic' || rest === 'matic'
  let n = raw
  if (raw.startsWith('am') && isRest(raw.slice(2))) n = raw.slice(2)
  else if (raw.startsWith('ma') && isRest(raw.slice(2))) n = raw.slice(2)
  else if (raw.startsWith('a') && aTokens.has(raw.slice(1))) n = raw.slice(1)
  if (n === 'wmatic' || n === 'matic') return 'matic'
  if (n === 'btc' || n === 'bitcoin') return 'wbtc'
  return n
}

function matchCollateralInList(list, key) {
  if (!key || !list?.length) return null
  const k = key.toLowerCase()
  return (
    list.find((c) => c.collateralType?.toLowerCase() === k) ||
    list.find((c) => c.name?.toLowerCase() === k) ||
    list.find((c) => collateralSpiritKey(c.name) === collateralSpiritKey(k)) ||
    null
  )
}

/**
 * Resolve collateral SVG/colors for a haunt.
 * Accepts library name (amWBTC), short name (wbtc), or any haunt's on-chain address.
 * Haunt-2 gotchis sometimes carry Haunt-1 (ma*) addresses from Base/snap — map by spirit.
 */
export function findCollateral(library, hauntId, collateralTypeOrName) {
  const key = String(collateralTypeOrName || '').trim().toLowerCase()
  if (!key) return null

  const hid = Number(hauntId)
  const haunt = hid === 3 ? 3 : hid === 2 ? 2 : 1
  const preferred = getCollateralsForHaunt(library, haunt)
  // H1↔H2 spirit crosswalk only. Never pull maDAI into H3 (was painting RH bodies orange).
  const others =
    haunt === 3
      ? []
      : [1, 2].filter((h) => h !== haunt).map((h) => getCollateralsForHaunt(library, h))

  // 1) Exact address / name in preferred haunt
  const hit = matchCollateralInList(preferred, key)
  if (hit) return hit

  // 2) Exact address / name in other haunts (H1/H2 same spirit art family)
  for (const other of others) {
    const cross = matchCollateralInList(other, key)
    if (cross) {
      const spirit = collateralSpiritKey(cross.name)
      if (spirit) {
        const sameHaunt = preferred.find((c) => collateralSpiritKey(c.name) === spirit)
        if (sameHaunt) return sameHaunt
      }
      return cross
    }
  }

  // 3) Short / vars-style names: "link", "aLINK", "wbtc", "amazon"
  const spirit = collateralSpiritKey(key)
  if (spirit) {
    const fromPreferred = preferred.find((c) => collateralSpiritKey(c.name) === spirit)
    if (fromPreferred) return fromPreferred
    for (const other of others) {
      const found = other.find((c) => collateralSpiritKey(c.name) === spirit)
      if (found) return found
    }
  }

  return null
}

export function findEyeShape(library, hauntId, eyeShapeTrait) {
  const shapes = library.eyeShapes[Number(hauntId)] || []
  const v = Number(eyeShapeTrait)
  // Wiki ranges are inclusive (e.g. Common 2 = 42–57). JSON often stores exclusive max.
  return (
    shapes.find((s) => {
      const min = Number(s.rangeMin)
      const max = Number(s.rangeMax)
      if (!Number.isFinite(min) || !Number.isFinite(max)) return false
      if (min === max) return v === min
      if (v >= min && v < max) return true
      return false
    }) ||
    shapes.find((s) => v >= Number(s.rangeMin) && v <= Number(s.rangeMax)) ||
    null
  )
}

export function wearablesForSlot(library, slotIndex) {
  return (library.wearables || []).filter((w) => {
    const slots = w.slotPositions || []
    return !!slots[slotIndex]
  })
}

function pickViewFragment(arr, viewIndex) {
  if (!arr || !arr.length) return ''
  // Honor intentional empty strings (e.g. H3 left/right hands = no front hands).
  // Only fall back to [0] when the index is out of range / missing.
  if (viewIndex >= 0 && viewIndex < arr.length && arr[viewIndex] != null) {
    return arr[viewIndex] || ''
  }
  return arr[0] || ''
}

/** RH ase body fill (art/rh-gotchi body layer lime) — same for every H3 brand. */
const H3_BODY_LIME = '#ccff00'
const H3_BODY_LIME_SECONDARY = '#e8ff66'

function buildStyleBlock(collateral, eyeColorHex, hasBodyWearable, hauntId = 1) {
  const isH3 = Number(hauntId) === 3
  // H3: fixed lime body for all brands; collateral logos stay hardcoded black in SVG.
  const primary = isH3 ? H3_BODY_LIME : hexFrom0x(collateral.primaryColor)
  const secondary = isH3 ? H3_BODY_LIME_SECONDARY : hexFrom0x(collateral.secondaryColor)
  const cheek = hexFrom0x(collateral.cheekColor)
  const open = hasBodyWearable
  // H3 RH ase: black face features (eyes/mouth/hands via gotchi-face)
  const mouthFill = isH3 ? '#000000' : primary
  const eyeFill = isH3 ? '#000000' : eyeColorHex
  const faceRule = isH3 ? '.gotchi-face{fill:#000000!important;}\n' : ''
  // Collateral marks: never recolor with brand primary
  const collateralRule = isH3
    ? '.gotchi-collateral,.gotchi-collateral *{fill:#000000!important;}\n'
    : ''
  // Use !important so nested spritesheet / img rendering keeps class fills.
  // Do NOT use `*` on eyeColor — nested `.gotchi-primary` paths inside eyes must keep primary (H1/H2).
  return `<style>
.gotchi-primary{fill:${primary}!important;}
.gotchi-secondary{fill:${secondary}!important;}
.gotchi-cheek{fill:${cheek}!important;}
.gotchi-eyeColor{fill:${eyeFill}!important;}
.gotchi-primary-mouth{fill:${mouthFill}!important;}
${faceRule}${collateralRule}.gotchi-sleeves-up{display:none;}
.gotchi-handsUp{display:none;}
.gotchi-handsDownOpen{display:${open ? 'block' : 'none'};}
.gotchi-handsDownClosed{display:${open ? 'none' : 'block'};}
</style>`
}

/** RH H3 face layers (eyes/mouth) are stored as gotchi-primary — force black face class. */
function reclassH3FaceLayer(frag: string): string {
  if (!frag) return ''
  return String(frag)
    .replace(/\bclass="gotchi-primary"/g, 'class="gotchi-face"')
    .replace(/\bclass="gotchi-primary-mouth"/g, 'class="gotchi-face"')
    .replace(/\bclass="gotchi-eyeColor"/g, 'class="gotchi-face"')
}

/** Bake class fills onto elements so texture load keeps eye/cheek colors. */
export function bakeGotchiSvgClassFills(svg: string): string {
  if (!svg || typeof DOMParser === 'undefined') return svg
  try {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const styleText = doc.querySelector('style')?.textContent || ''
    const colorFor = (cls: string): string | null => {
      // Match `.cls{fill:…}` and grouped rules like `.gotchi-collateral,.gotchi-collateral *{…}`.
      // Capture fill color before optional !important (do not swallow '#000000').
      const re = new RegExp(`\\.${cls}(?:\\s*,[^,{]*)*\\s*\\{[^}]*fill:\\s*([^;!}\\s]+)`, 'i')
      const m = styleText.match(re)
      return m ? m[1].trim() : null
    }
    // Primary/secondary first, then face/collateral last so black shell + logos win
    // when nested under a body/primary group (PNG raster ignores CSS classes).
    const classes = [
      'gotchi-primary',
      'gotchi-secondary',
      'gotchi-cheek',
      'gotchi-eyeColor',
      'gotchi-primary-mouth',
      'gotchi-face',
      'gotchi-collateral',
    ] as const
    const paintClass = new Set(classes)
    const solidFill = (el: Element, color: string) => {
      el.setAttribute('fill', color)
      // Opaque paint for Phaser PNG — do not force element opacity (shadows keep .25).
      el.setAttribute('fill-opacity', '1')
    }
    const hasOtherPaintClass = (classAttr: string, cls: string) => {
      if (!classAttr) return false
      for (const token of classAttr.split(/\s+/)) {
        if (paintClass.has(token as (typeof classes)[number]) && token !== cls) return true
      }
      return false
    }
    // H3 brands force mono-black logos via style; WBTC/etc keep multi-color SVG fills.
    const forceMonoCollateral = Boolean(colorFor('gotchi-collateral'))
    for (const cls of classes) {
      // Face defaults black. Collateral only paints when style provides a color
      // (H3 black logos) — never invent black and wipe WBTC orange (#ff5e00).
      const color =
        colorFor(cls) ||
        (cls === 'gotchi-face' ? '#000000' : null)
      if (!color) continue
      doc.querySelectorAll(`.${cls}`).forEach((el) => {
        if (cls === 'gotchi-collateral' && !forceMonoCollateral) {
          // Multi-color collateral (e.g. amWBTC): leave authored fills alone.
          el.querySelectorAll('path,rect,circle,polygon,polyline,ellipse,g').forEach((child) => {
            const childEl = child as Element
            if (childEl.getAttribute('fill') && childEl.getAttribute('fill') !== 'none') {
              childEl.setAttribute('fill-opacity', '1')
            }
          })
          return
        }
        solidFill(el, color)
        // Paint bare shape descendants only — never recolor nested paint-class groups.
        // Include nested <g fill="…"> so H3 mono-black can override multi-color groups.
        el.querySelectorAll('path,rect,circle,polygon,polyline,ellipse,g').forEach((child) => {
          const childEl = child as Element
          const childClass = childEl.getAttribute('class') || ''
          if (hasOtherPaintClass(childClass, cls)) return
          // Skip shapes that live under a nested paint group (e.g. primary inside face).
          let ancestor = childEl.parentElement
          let nestedOther = false
          while (ancestor && ancestor !== el) {
            if (hasOtherPaintClass(ancestor.getAttribute('class') || '', cls)) {
              nestedOther = true
              break
            }
            ancestor = ancestor.parentElement
          }
          if (nestedOther) return
          if (childEl.localName === 'g') {
            // Only recolor groups that already declare a fill (e.g. WBTC orange pocket).
            if (!childEl.getAttribute('fill') || childEl.getAttribute('fill') === 'none') return
          }
          solidFill(childEl, color)
        })
      })
    }
    // Opaque painted shapes; do not invent fills on multi-color collaterals.
    doc
      .querySelectorAll(
        '.gotchi-primary, .gotchi-secondary, .gotchi-cheek, .gotchi-eyeColor, .gotchi-primary-mouth, .gotchi-face',
      )
      .forEach((el) => {
        if (!(el.getAttribute('class') || '').includes('gotchi-shadow')) {
          if (!el.getAttribute('fill-opacity')) el.setAttribute('fill-opacity', '1')
        }
      })
    // Collateral: only force opacity on shapes that already have a fill (keeps BTC orange).
    doc.querySelectorAll('.gotchi-collateral path, .gotchi-collateral rect, .gotchi-collateral g').forEach((el) => {
      const fill = el.getAttribute('fill')
      if (fill && fill !== 'none') el.setAttribute('fill-opacity', '1')
    })
    const root = doc.documentElement
    return root ? new XMLSerializer().serializeToString(root) : svg
  } catch {
    return svg
  }
}

const LEFT_HAND_SLOT = 4
const RIGHT_HAND_SLOT = 5

/** On-chain side views only show the hand facing the camera. */
function shouldRenderHandWearable(slot, viewIndex) {
  if (slot !== LEFT_HAND_SLOT && slot !== RIGHT_HAND_SLOT) return true
  switch (viewIndex) {
    case 0: return true // Front — both hands
    case 1: return slot === RIGHT_HAND_SLOT // Left profile — RH item only
    case 2: return slot === LEFT_HAND_SLOT // Right profile — LH item only
    case 3: return true // Back — both (behind body)
    default: return true
  }
}

/**
 * Hand wearables are authored for the left side of the canvas on Front/Back.
 * - Front RH (slot 5): mirror across canvas
 * - Back LH (slot 4): mirror across canvas (from behind, character left is viewer right)
 */
function wrapWearable(fragment, slot, viewIndex = 0) {
  if (!fragment) return ''
  const classBySlot = {
    0: 'wearable-body',
    1: 'wearable-face',
    2: 'wearable-eyes',
    3: 'wearable-head',
    4: 'wearable-hand wearable-hand-left',
    5: 'wearable-hand wearable-hand-right',
    6: 'wearable-pet',
    7: 'wearable-bg'
  }
  const cls = classBySlot[slot] || 'wearable'

  let content = fragment
  const mirrorFrontRight = slot === RIGHT_HAND_SLOT && viewIndex === 0
  const mirrorBackLeft = slot === LEFT_HAND_SLOT && viewIndex === 3
  if (mirrorFrontRight || mirrorBackLeft) {
    // Match on-chain: flip across the 64px canvas so LH/RH land on the correct side
    content = `<g transform="translate(64, 0) scale(-1, 1)">${fragment}</g>`
  }

  return `<g class="gotchi-wearable ${cls}">${content}</g>`
}

function handWearableLayers(wearables, lib, viewIndex) {
  const layers = []
  for (const slot of [LEFT_HAND_SLOT, RIGHT_HAND_SLOT]) {
    if (!shouldRenderHandWearable(slot, viewIndex)) continue
    const id = wearables[slot]
    if (!id) continue
    const w = lib.wearablesById.get(id)
    if (!w) continue
    layers.push(wrapWearable(pickViewFragment(w.svgs, viewIndex), slot, viewIndex))
  }
  return layers
}

/**
 * Body wearable SVGs already nest `<svg x y>`; sleeve fragments are local and need the same offset.
 * Prefer x/y from the body fragment, else previewoffsets for that view.
 */
function wearableViewOffset(wearable, viewIndex) {
  const frag = pickViewFragment(wearable?.svgs, viewIndex) || ''
  const mx = frag.match(/\bx="([^"]+)"/i)
  const my = frag.match(/\by="([^"]+)"/i)
  if (mx || my) {
    return { x: mx?.[1] || '0', y: my?.[1] || '0' }
  }
  const off = wearable?.previewoffsets?.[viewIndex] || wearable?.previewoffsets?.[0]
  if (off && (off.x != null || off.y != null)) {
    return { x: String(off.x ?? 0), y: String(off.y ?? 0) }
  }
  const d = wearable?.dimensions
  if (Array.isArray(d) && d.length >= 2 && (Number(d[0]) || Number(d[1]))) {
    return { x: String(d[0] || 0), y: String(d[1] || 0) }
  }
  return null
}

function sleevesForWearable(wearable, viewIndex, hasBodyWearable) {
  if (!wearable?.sleeves || !hasBodyWearable) return ''
  const sleeve = pickViewFragment(wearable.sleeves, viewIndex)
  if (!sleeve) return ''
  const off = wearableViewOffset(wearable, viewIndex)
  const inner = off ? `<svg x="${off.x}" y="${off.y}">${sleeve}</svg>` : sleeve
  // Prefer sleeves-down content when present; CSS hides sleeves-up
  return `<g class="gotchi-wearable wearable-sleeves">${inner}</g>`
}

export type ComposeGotchiInput = {
  hauntId?: number
  collateralType?: string
  /** When ES ≥ 98, optional override for collateral eye SVG (does not change spirit force). */
  eyeShapeCollateral?: string | null
  numericTraits?: number[]
  equippedWearables?: number[]
}

/**
 * @param input haunt / collateral / traits / wearables
 * @param library optional preloaded library from loadLibrary()
 */
export async function composeAllViews(
  input: ComposeGotchiInput,
  library?: any,
): Promise<Record<string, string>> {
  const lib = library || (await loadLibrary())
  const hauntId = Number(input.hauntId) || 1
  const traits = (input.numericTraits || [50, 50, 50, 50, 50, 50]).map(Number)
  const wearables = Array.from({ length: 16 }, (_, i) => Number(input.equippedWearables?.[i] || 0))

  const collateral = findCollateral(lib, hauntId, input.collateralType)
  if (!collateral) {
    throw new Error(`Collateral not found for haunt ${hauntId}: ${input.collateralType}`)
  }

  const eyeShapeTrait = traits[4] ?? 50
  const eyeColorTrait = traits[5] ?? 50
  const eyeColorHex = getEyeColorHex(eyeColorTrait, collateral.primaryColor)
  const hasBodyWearable = wearables[0] > 0
  const isH3 = hauntId === 3

  // H3 RH ase uses fixed base eyes/mouth from main_haunt3 — not classic eye-shape SVGs.
  const useCollateralEyes = !isH3 && eyeShapeTrait >= 98
  const eyeShape = isH3 || useCollateralEyes ? null : findEyeShape(lib, hauntId, eyeShapeTrait)
  const eyeCollateral =
    useCollateralEyes && input.eyeShapeCollateral
      ? findCollateral(lib, hauntId, input.eyeShapeCollateral) || collateral
      : collateral

  const result: Record<string, string> = {}
  for (let viewIndex = 0; viewIndex < 4; viewIndex++) {
    result[VIEW_NAMES[viewIndex]] = bakeGotchiSvgClassFills(
      composeSvgView({
        lib,
        hauntId,
        collateral,
        eyeCollateral,
        eyeShape,
        useCollateralEyes,
        eyeColorHex,
        hasBodyWearable,
        wearables,
        viewIndex
      }),
    )
  }
  return result
}

function composeSvgView({
  lib,
  hauntId = 1,
  collateral,
  eyeCollateral,
  eyeShape,
  useCollateralEyes,
  eyeColorHex,
  hasBodyWearable,
  wearables,
  viewIndex
}) {
  const main = getMainForHaunt(lib, hauntId)
  const isH3 = Number(hauntId) === 3
  const layers = []
  const eyesFrom = eyeCollateral || collateral

  layers.push(buildStyleBlock(collateral, eyeColorHex, hasBodyWearable, hauntId))

  // H3 RH ase bg (black / lime checker) — behind everything, class gotchi-bg-rh so strip keeps it
  if (isH3 && main.bg) {
    const bg = pickViewFragment(main.bg, viewIndex)
    if (bg) layers.push(bg)
  }

  // Background wearable (slot 7) behind body (still above RH checker bg)
  if (wearables[7] > 0) {
    const w = lib.wearablesById.get(wearables[7])
    if (w) layers.push(wrapWearable(pickViewFragment(w.svgs, viewIndex), 7, viewIndex))
  }

  // Body (H3 RH ase: outline + lime fill; shadow is a separate layer for float anim)
  layers.push(pickViewFragment(main.body, viewIndex))

  // Back view: hand wearables sit behind the body (before eyes/hands)
  if (viewIndex === 3) {
    layers.push(...handWearableLayers(wearables, lib, viewIndex))
  }

  // Mouth — H1/H2 front body embeds mouth; H3 RH ase has a separate black mouth layer
  if (viewIndex === 0) {
    if (isH3 && main.mouth_happy?.[0]) {
      layers.push(reclassH3FaceLayer(main.mouth_happy[0]))
    } else {
      const bodyFrag = String(pickViewFragment(main.body, 0) || '')
      const bodyHasMouth = bodyFrag.includes('gotchi-primary-mouth') || bodyFrag.includes('gotchi-mouth')
      if (!bodyHasMouth && main.mouth_happy?.[0]) {
        layers.push(main.mouth_happy[0])
      }
    }
  } else if (!isH3 && main.mouth_neutral?.[0] && viewIndex !== 3) {
    // side mouths not in library; leave empty
  }

  // Eyes (not on back)
  if (viewIndex !== 3) {
    let eyeFrag = ''
    if (isH3 && main.eyes_happy?.length) {
      // RH: front/left/right eye fragments (black). No mouth on side views.
      const eyeView = Math.min(viewIndex, main.eyes_happy.length - 1)
      eyeFrag = reclassH3FaceLayer(pickViewFragment(main.eyes_happy, eyeView))
    } else if (useCollateralEyes && eyesFrom.eyeShapeSvgs) {
      eyeFrag = pickViewFragment(eyesFrom.eyeShapeSvgs, Math.min(viewIndex, eyesFrom.eyeShapeSvgs.length - 1))
    } else if (eyeShape?.svgs) {
      // eyeShapes: [front, left, right]
      const eyeView = viewIndex === 0 ? 0 : viewIndex === 1 ? 1 : 2
      eyeFrag = pickViewFragment(eyeShape.svgs, eyeView)
    }
    if (eyeFrag) layers.push(eyeFrag)
  }

  // Collateral logo (skip back — often blank/duplicate of side)
  if (viewIndex !== 3 && collateral.svgs) {
    const logo = pickViewFragment(collateral.svgs, viewIndex)
    if (logo) layers.push(logo)
  }

  // Hands + wearables. Front matches SvgFacet: sleeves under hand items.
  // H3: closed strokes are gotchi-face (black); open-down/open-up use primary lime/body fill.
  // Side views leave hands empty (body includes profile arm folds). Back = hands down open only.
  let hands = pickViewFragment(main.hands, viewIndex)
  if (isH3 && viewIndex === 3) {
    // Naked H3 style hides .gotchi-handsDownOpen — force it visible on back.
    let openBack = pickViewFragment(main.hands_down_open, 3)
    if (openBack) {
      openBack = openBack.replace(
        /class="gotchi-handsDownOpen"/,
        'class="gotchi-handsDownOpen" style="display:block"',
      )
    }
    hands = openBack || ''
  }
  const handWearables = viewIndex === 3 ? [] : handWearableLayers(wearables, lib, viewIndex)

  const pushSlot = (slot) => {
    const id = wearables[slot]
    if (!id) return
    const w = lib.wearablesById.get(id)
    if (!w) return
    layers.push(wrapWearable(pickViewFragment(w.svgs, viewIndex), slot, viewIndex))
  }
  const pushSleeves = () => {
    const id = wearables[0]
    if (!id) return
    const w = lib.wearablesById.get(id)
    if (w) layers.push(sleevesForWearable(w, viewIndex, hasBodyWearable))
  }

  if (viewIndex === 0) {
    // Front: body → hands → face/eyes/head → sleeves → hand items → pet
    pushSlot(0)
    if (hands) layers.push(hands)
    for (const slot of [1, 2, 3]) pushSlot(slot)
    pushSleeves()
    layers.push(...handWearables)
    pushSlot(6)
  } else if (viewIndex === 1 || viewIndex === 2) {
    // Side: clothing → near-hand item under strokes → hands → sleeves → pet
    // H3 side body already includes arm/belly profile — skip empty/wrong front hands.
    pushSlot(0)
    for (const slot of [1, 2, 3]) pushSlot(slot)
    layers.push(...handWearables)
    if (hands) layers.push(hands)
    pushSleeves()
    pushSlot(6)
  } else {
    // Back: hand items already behind body; body/head → hands → sleeves → pet
    if (hands) layers.push(hands)
    pushSlot(0)
    for (const slot of [1, 2, 3]) pushSlot(slot)
    pushSleeves()
    pushSlot(6)
  }

  // Shadow as sibling layer (not nested in body) so float CSS can animate it opposite the body.
  // H1/H2 front body often already embeds .gotchi-shadow — skip duplicate in that case.
  {
    const bodyFrag = String(pickViewFragment(main.body, viewIndex) || '')
    const shadow = pickViewFragment(
      main.shadow,
      viewIndex === 3 ? 0 : Math.min(viewIndex, Math.max((main.shadow || []).length - 1, 0)),
    )
    if (shadow && !bodyFrag.includes('gotchi-shadow')) {
      layers.push(shadow)
    }
  }

  const crisp = isH3 ? ' shape-rendering="crispEdges"' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"${crisp}>${layers.filter(Boolean).join('')}</svg>`
}

/** Parse ethers previewSideAavegotchi response into string[4]. */
export function parsePreviewSideResponse(response) {
  let svgArray = []
  if (!response) return svgArray

  if (Array.isArray(response)) {
    svgArray = [...response]
  } else if (typeof response === 'object') {
    if (typeof response.length === 'number') {
      for (let i = 0; i < response.length; i++) {
        if (response[i] !== undefined) svgArray.push(response[i])
      }
    } else if (response.ag_) {
      const ag = response.ag_
      if (Array.isArray(ag)) svgArray = [...ag]
      else if (typeof ag === 'string') svgArray = [ag]
      else if (ag && typeof ag.length === 'number') {
        for (let i = 0; i < ag.length; i++) {
          if (ag[i] !== undefined) svgArray.push(ag[i])
        }
      }
    }
  }

  return svgArray.map((s) => (typeof s === 'string' ? s : String(s ?? '')))
}

export function previewSidesToNamed(svgArray) {
  const named = {}
  VIEW_NAMES.forEach((name, i) => {
    named[name] = svgArray[i] || ''
  })
  return named
}
