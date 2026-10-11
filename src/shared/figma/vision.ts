// Colour-vision simulation and colour difference. Pure math, like color.ts: safe to unit test
// and to run in the UI. Matrices are Machado, Oliveira & Fernandes (2009) at severity 1.0,
// applied in linear RGB — the same numbers the Figma "Vision Sim Tile" set was drawn with.
import type { RGB } from './color'

export type VisionSimulation = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia' | 'low-vision'

/** Display order, matching the Figma "Vision Sim Grid". */
export const VISION_SIMULATIONS: readonly VisionSimulation[] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia', 'low-vision']

/** Blur radius standing in for reduced acuity — the Figma Low vision tile's layer blur. */
export const LOW_VISION_BLUR_PX = 2.5

/** Below this CIE76 ΔE two colours read as "the same" at badge size. */
export const DISTINCT_DELTA_E = 25

type Matrix = readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]]

const MATRICES: Record<'protanopia' | 'deuteranopia' | 'tritanopia', Matrix> = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const toGamma = (c: number) => { const v = clamp01(c); return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055 }

/** How `color` appears to someone with the given colour vision. Low vision is a blur, not a
 *  hue shift, so the colour itself is returned unchanged — render the blur in CSS. */
export function simulateVision(color: RGB, kind: VisionSimulation): RGB {
  if (kind === 'normal' || kind === 'low-vision') return color
  const r = toLinear(color.r), g = toLinear(color.g), b = toLinear(color.b)
  if (kind === 'achromatopsia') {
    const y = toGamma(0.2126 * r + 0.7152 * g + 0.0722 * b)
    return { r: y, g: y, b: y }
  }
  const m = MATRICES[kind]
  return {
    r: toGamma(m[0][0] * r + m[0][1] * g + m[0][2] * b),
    g: toGamma(m[1][0] * r + m[1][1] * g + m[1][2] * b),
    b: toGamma(m[2][0] * r + m[2][1] * g + m[2][2] * b),
  }
}

function toLab(color: RGB): [number, number, number] {
  const r = toLinear(color.r), g = toLinear(color.g), b = toLinear(color.b)
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047)
  const y = f(r * 0.2126 + g * 0.7152 + b * 0.0722)
  const z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

/** CIE76 colour difference (Euclidean distance in L*a*b*, D65). */
export function deltaE76(a: RGB, b: RGB): number {
  const p = toLab(a), q = toLab(b)
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
}

/** Whether two colours that carry meaning by hue alone stay distinguishable under `kind`.
 *  Low vision never passes: a blur erases the difference regardless of hue. */
export function staysDistinct(a: RGB, b: RGB, kind: VisionSimulation): boolean {
  if (kind === 'low-vision') return false
  return deltaE76(simulateVision(a, kind), simulateVision(b, kind)) >= DISTINCT_DELTA_E
}
