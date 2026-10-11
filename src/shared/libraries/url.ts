/** The Figma link that opens a node in its library file ("40000040:5139" → node-id=40000040-5139). */
export function figmaUrl(fileKey: string, nodeId?: string): string {
  const base = `https://www.figma.com/design/${encodeURIComponent(fileKey)}/`
  return nodeId ? `${base}?node-id=${encodeURIComponent(nodeId.replace(/:/g, '-'))}` : base
}
