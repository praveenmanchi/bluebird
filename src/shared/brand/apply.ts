import { toCssVariables, type TokenMap } from './tokens'

const applied = new Set<string>()

/** Write brand tokens onto :root so Tailwind's @theme inline picks them up instantly. */
export function applyTokens(tokens: TokenMap, root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(toCssVariables(tokens))) {
    root.style.setProperty(name, value)
    applied.add(name)
  }
}

/** Remove every token applyTokens wrote, so a brand switch falls back to the generated [data-brand] CSS. */
export function clearTokens(root: HTMLElement = document.documentElement): void {
  for (const name of applied) root.style.removeProperty(name)
  applied.clear()
}
