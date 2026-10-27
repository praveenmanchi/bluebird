import info from '../../build-info.json'

/** Version stamped by `npm run build` (scripts/bump-build.ts bumps the patch on every build). */
export const BUILD_VERSION: string = info.version

/** ISO time of the last `npm run build`. */
export const BUILD_UPDATED_AT: string = info.updatedAt

/** "28 Oct 2026" — the banner's "Updated …" date. Empty for a missing or invalid stamp. */
export function formatBuildDate(iso: string = BUILD_UPDATED_AT): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
