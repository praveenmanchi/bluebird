import { toCssVariables, type TokenMap } from './tokens'

/** Write brand tokens onto :root so Tailwind's @theme inline picks them up instantly. */
export function applyTokens(tokens: TokenMap, root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(toCssVariables(tokens))) {
    root.style.setProperty(name, value)
  }
}
