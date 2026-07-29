/**
 * Offline Aavegotchi composer from the JSON SVG library under /data/.
 * Ported from AavegotchiQuerey `src/utils/composeGotchi.js`.
 * Used for soft-launch cAavegotchi previews (not wallet L1 gotchis).
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

function hexFrom0x(value) {
  if (!value) return '#000000'
  const s = String(value).trim()
  if (s.startsWith('#')) return s
  if (s.startsWith('0x') || s.startsWith('0X')) return `#${s.slice(2)}`
  return `#${s}`
}

/**
 * Trait values are 0–99. Mythical eye shape is 0 — never use `Number(n) || 50`
 * (that silently turns Single Dot into Common rectangles).
 */
export function traitNumber(value: unknown, fallback = 50): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
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
    collateralsH1,
    collateralsH2,
    eyeShapesH1,
    eyeShapesH2,
    wearables,
    rarity
  ] = await Promise.all([
    fetch(`${DATA_BASE}/aavegotchi_db_main.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_collaterals_haunt1.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_collaterals_haunt2.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_eye_shapes_haunt1.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_eye_shapes_haunt2.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_wearables.json`).then((r) => r.json()),
    fetch(`${DATA_BASE}/aavegotchi_db_rarity.json`).then((r) => r.json()).catch(() => null)
  ])

  libraryCache = {
    main,
    collaterals: {
      1: collateralsH1.collaterals || [],
      2: collateralsH2.collaterals || []
    },
    eyeShapes: {
      1: eyeShapesH1.eyeShapes || [],
      2: eyeShapesH2.eyeShapes || []
    },
    wearables: wearables.wearables || [],
    wearablesById: new Map((wearables.wearables || []).map((w) => [Number(w.id), w])),
    rarity
  }
  return libraryCache
}

export function clearLibraryCache() {
  libraryCache = null
}

export function getCollateralsForHaunt(library, hauntId) {
  return library.collaterals[Number(hauntId)] || []
}

export function findCollateral(library, hauntId, collateralTypeOrName) {
  const list = getCollateralsForHaunt(library, hauntId)
  const key = String(collateralTypeOrName || '').toLowerCase()
  return (
    list.find((c) => c.collateralType?.toLowerCase() === key) ||
    list.find((c) => c.name?.toLowerCase() === key) ||
    null
  )
}

/**
 * Soft-mint gallery mixes haunt-1 aTokens (aUSDC) and haunt-2 amTokens (amWBTC).
 * Resolve collateral in the requested haunt first, then the other.
 */
export function findCollateralAnyHaunt(
  library,
  hauntId,
  collateralTypeOrName,
): { collateral: any; hauntId: number } | null {
  const preferred = Number(hauntId) === 2 ? 2 : 1
  const other = preferred === 2 ? 1 : 2
  const inPreferred = findCollateral(library, preferred, collateralTypeOrName)
  if (inPreferred) return { collateral: inPreferred, hauntId: preferred }
  const inOther = findCollateral(library, other, collateralTypeOrName)
  if (inOther) return { collateral: inOther, hauntId: other }
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
      // Prefer half-open [min, max) when max > min (library convention)
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
  if (arr[viewIndex] != null && arr[viewIndex] !== '') return arr[viewIndex]
  return arr[0] || ''
}

function buildStyleBlock(collateral, eyeColorHex, hasBodyWearable) {
  const primary = hexFrom0x(collateral.primaryColor)
  const secondary = hexFrom0x(collateral.secondaryColor)
  const cheek = hexFrom0x(collateral.cheekColor)
  const open = hasBodyWearable
  // Use !important so Phaser / nested <image> spritesheets keep class fills.
  // Do NOT use `*` on eyeColor — nested `.gotchi-primary` paths inside eyes must keep primary.
  return `<style>
.gotchi-primary{fill:${primary}!important;}
.gotchi-secondary{fill:${secondary}!important;}
.gotchi-cheek{fill:${cheek}!important;}
.gotchi-eyeColor{fill:${eyeColorHex}!important;}
.gotchi-primary-mouth{fill:${primary}!important;}
.gotchi-sleeves-up{display:none;}
.gotchi-handsUp{display:none;}
.gotchi-handsDownOpen{display:${open ? 'block' : 'none'};}
.gotchi-handsDownClosed{display:${open ? 'none' : 'block'};}
</style>`
}

/** Bake class fills onto elements so Phaser texture load keeps eye/cheek colors. */
export function bakeGotchiSvgClassFills(svg: string): string {
  if (!svg || typeof DOMParser === 'undefined') return svg
  try {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const styleEl = doc.querySelector('style')
    const styleText = styleEl?.textContent || ''
    const colorFor = (cls: string): string | null => {
      const re = new RegExp(`\\.${cls}\\s*\\{[^}]*fill:\\s*([^;!}]+)`, 'i')
      const m = styleText.match(re)
      return m ? m[1].trim() : null
    }
    const classes = [
      'gotchi-primary',
      'gotchi-secondary',
      'gotchi-cheek',
      'gotchi-eyeColor',
      'gotchi-primary-mouth',
    ] as const
    for (const cls of classes) {
      const color = colorFor(cls)
      if (!color) continue
      doc.querySelectorAll(`.${cls}`).forEach((el) => {
        el.setAttribute('fill', color)
        el.querySelectorAll('path,rect,circle,polygon,polyline,ellipse').forEach((child) => {
          const childEl = child as Element
          const childClass = childEl.getAttribute('class') || ''
          if (/gotchi-(primary|secondary|cheek|eyeColor|primary-mouth)/.test(childClass)) return
          const existing = childEl.getAttribute('fill')
          // Keep explicit fills (Haunt 2 mythical eyes use fill="#fff" for the dot/hole).
          if (existing && existing !== 'none') return
          childEl.setAttribute('fill', color)
        })
      })
    }
    // Drop class fill rules after baking so !important CSS cannot override #fff eye holes.
    if (styleEl) {
      styleEl.textContent = styleText
        .replace(
          /\.gotchi-(?:primary|secondary|cheek|eyeColor|primary-mouth)\s*\{[^}]*\}/gi,
          '',
        )
        .replace(/\n{2,}/g, '\n')
    }
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

/** Body wearable nested <svg x y> (or previewoffsets) — sleeves use the same local space. */
function wearableViewOffset(wearable, viewIndex): { x: string; y: string } | null {
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
  return null
}

function sleevesForWearable(wearable, viewIndex, hasBodyWearable) {
  if (!wearable?.sleeves || !hasBodyWearable) return ''
  const sleeve = pickViewFragment(wearable.sleeves, viewIndex)
  if (!sleeve) return ''
  // Sleeve path coords are local to the body wearable's nested svg (same x/y as svgs[view]).
  // Without that offset they paint near the canvas top and white open-hands show instead.
  const off = wearableViewOffset(wearable, viewIndex)
  const inner = off ? `<svg x="${off.x}" y="${off.y}">${sleeve}</svg>` : sleeve
  // Prefer sleeves-down content when present; CSS hides sleeves-up
  return `<g class="gotchi-wearable wearable-sleeves">${inner}</g>`
}

export type ComposeGotchiInput = {
  hauntId?: number
  collateralType?: string
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
  const requestedHaunt = Number(input.hauntId) || 1
  const traits = (input.numericTraits || [50, 50, 50, 50, 50, 50]).map(Number)
  const wearables = Array.from({ length: 16 }, (_, i) => Number(input.equippedWearables?.[i] || 0))

  const resolved = findCollateralAnyHaunt(lib, requestedHaunt, input.collateralType)
  if (!resolved) {
    throw new Error(`Collateral not found for haunt ${requestedHaunt}: ${input.collateralType}`)
  }
  const { collateral, hauntId } = resolved

  const eyeShapeTrait = traits[4] ?? 50
  const eyeColorTrait = traits[5] ?? 50
  const eyeColorHex = getEyeColorHex(eyeColorTrait, collateral.primaryColor)
  const hasBodyWearable = wearables[0] > 0

  const useCollateralEyes = eyeShapeTrait >= 98
  const eyeShape = useCollateralEyes ? null : findEyeShape(lib, hauntId, eyeShapeTrait)

  const result: Record<string, string> = {}
  for (let viewIndex = 0; viewIndex < 4; viewIndex++) {
    result[VIEW_NAMES[viewIndex]] = bakeGotchiSvgClassFills(
      composeSvgView({
        lib,
        collateral,
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
  collateral,
  eyeShape,
  useCollateralEyes,
  eyeColorHex,
  hasBodyWearable,
  wearables,
  viewIndex
}) {
  const main = lib.main
  const layers = []

  layers.push(buildStyleBlock(collateral, eyeColorHex, hasBodyWearable))

  // Background wearable (slot 7) behind body
  if (wearables[7] > 0) {
    const w = lib.wearablesById.get(wearables[7])
    if (w) layers.push(wrapWearable(pickViewFragment(w.svgs, viewIndex), 7, viewIndex))
  }

  // Body
  layers.push(pickViewFragment(main.body, viewIndex))

  // Back view: held items sit behind the body (before eyes / clothing / hands)
  if (viewIndex === 3) {
    layers.push(...handWearableLayers(wearables, lib, viewIndex))
  }

  // Mouth (library only has front fragments; skip if empty)
  if (viewIndex === 0) {
    // Front body already embeds a mouth; skip extra mouth to avoid double
  } else if (main.mouth_neutral?.[0] && viewIndex !== 3) {
    // side mouths not in library; leave empty
  }

  // Eyes (not on back)
  if (viewIndex !== 3) {
    let eyeFrag = ''
    if (useCollateralEyes && collateral.eyeShapeSvgs) {
      eyeFrag = pickViewFragment(collateral.eyeShapeSvgs, Math.min(viewIndex, collateral.eyeShapeSvgs.length - 1))
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

  // On-chain front order (SvgFacet.addBodyAndWearableSvgLayers):
  // bodyWearable → hands → face → eyes → head → sleeves → handL → handR → pet
  // Hand items must paint after body/sleeves or suit arms cover the held gear.
  const pushSlot = (slot: number) => {
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

  const hands = pickViewFragment(main.hands, viewIndex)
  const handWearables = viewIndex === 3 ? [] : handWearableLayers(wearables, lib, viewIndex)

  if (viewIndex === 3) {
    // Back: hand wearables already inserted behind eyes/logo; body clothing then hands on top
    pushSlot(0)
    for (const slot of [1, 2, 3]) pushSlot(slot)
    pushSleeves()
    if (hands) layers.push(hands)
    pushSlot(6)
  } else if (viewIndex === 1 || viewIndex === 2) {
    // Side: clothing first; items under hand strokes (gripping look)
    pushSlot(0)
    for (const slot of [1, 2, 3]) pushSlot(slot)
    pushSleeves()
    layers.push(...handWearables)
    if (hands) layers.push(hands)
    pushSlot(6)
  } else {
    // Front: match SvgFacet — hand wearables last so they sit on top of hands/sleeves
    pushSlot(0)
    if (hands) layers.push(hands)
    for (const slot of [1, 2, 3]) pushSlot(slot)
    pushSleeves()
    layers.push(...handWearables)
    pushSlot(6)
  }

  // Shadow (if not already in body — body front includes shadow; still ok to skip duplicate)
  // Only add separate shadow for views where body may not include it
  if (viewIndex !== 0) {
    const shadow = pickViewFragment(main.shadow, viewIndex === 3 ? 0 : Math.min(viewIndex, (main.shadow || []).length - 1))
    if (shadow && !String(pickViewFragment(main.body, viewIndex)).includes('gotchi-shadow')) {
      layers.push(shadow)
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${layers.filter(Boolean).join('')}</svg>`
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
