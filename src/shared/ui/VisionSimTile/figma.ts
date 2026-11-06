import { scaleGaps } from '../../brand/scaleGaps'
const simulated = 'Sample and pill fills are the pair as simulated at runtime (simulateVision, Machado 2009) — Figma bakes the red/green example for each Simulation.'

/** Figma ↔ code contract for VisionSimTile ("Vision Sim Tile" 40000463:9248). */
export const figma = {
  setId: '40000463:9248',
  name: 'Vision Sim Tile',
  props: {
    Simulation: 'simulation ("normal" | "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia" | "low-vision")',
    'Sample · Pill · Error / Success': 'colors.a / colors.b / colors.bg + labels',
    Name: 'name (defaults to the simulation name)',
    Caption: 'caption (defaults to who it affects)',
    'Status (Meta Badge)': 'derived from staysDistinct(): Distinct / Look alike / Blurred',
  },
  figmaGaps: {
    ...scaleGaps('font/size-caption', 'font/family-ui', 'font/line-caption', 'border-width/default'),
    'feedback/success': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'feedback/danger': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'radius/pill': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'space/inline-xs': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'space/inline-sm': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
    'space/inset-xs': 'Bound on the nested MetaBadge (Status); rendered by the composed <MetaBadge>.',
  },
  derivedGaps: {
    '--bb-derived-vision-sim-tile-root-width': 'Tiles fill their grid column (VisionSimGrid: three equal columns) instead of pinning 137px.',
    '--bb-derived-vision-sim-tile-sample-fill': 'The sample background is colors.bg as simulated at runtime (white in the Figma example).',
    '--bb-derived-vision-sim-tile-pill-error-simulation-normal-fill': simulated,
    '--bb-derived-vision-sim-tile-pill-error-simulation-protanopia-fill': simulated,
    '--bb-derived-vision-sim-tile-pill-error-simulation-deuteranopia-fill': simulated,
    '--bb-derived-vision-sim-tile-pill-error-simulation-tritanopia-fill': simulated,
    '--bb-derived-vision-sim-tile-pill-error-simulation-achromatopsia-fill': simulated,
    '--bb-derived-vision-sim-tile-pill-error-simulation-low-vision-fill': simulated,
    '--bb-derived-vision-sim-tile-pill-success-simulation-normal-fill': simulated,
    '--bb-derived-vision-sim-tile-pill-success-simulation-protanopia-fill': simulated,
    '--bb-derived-vision-sim-tile-pill-success-simulation-deuteranopia-fill': simulated,
    '--bb-derived-vision-sim-tile-pill-success-simulation-tritanopia-fill': simulated,
    '--bb-derived-vision-sim-tile-pill-success-simulation-achromatopsia-fill': simulated,
    '--bb-derived-vision-sim-tile-pill-success-simulation-low-vision-fill': simulated,
  },
  notes: 'Created 2026-10-11 for the WCAG card Mode=Vision preview. Low vision is a 2.5px layer blur in Figma and filter: blur(2.5px) in code; it never counts as distinct.',
} as const
