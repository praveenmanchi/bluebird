// Figma REST client: one GET helper with the token check and a typed HTTP error.

export class FigmaHttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }

  /** Figma answers 403 both for a plan without the endpoint and for a token without the scope. */
  get isScope(): boolean { return this.status === 403 && /scope/i.test(this.message) }
}

export async function figmaGet<T>(path: string): Promise<T> {
  const token = process.env.FIGMA_TOKEN
  if (!token) throw new Error('FIGMA_TOKEN is not set (personal access token with file_content:read, plus file_variables:read on Enterprise)')
  const res = await fetch(`https://api.figma.com/v1${path}`, { headers: { 'X-Figma-Token': token } })
  if (!res.ok) throw new FigmaHttpError(res.status, `Figma API ${res.status} for ${path}: ${await res.text()}`)
  return res.json() as Promise<T>
}

/** `?version=` pins a read to one saved Figma version, so a pull is reproducible. */
export function withVersion(path: string, version: string | undefined): string {
  if (!version) return path
  return `${path}${path.includes('?') ? '&' : '?'}version=${encodeURIComponent(version)}`
}
