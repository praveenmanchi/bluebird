// Figma "MCP v2 · 1 Select" body — the shell every MCP step shares. The other
// happy-path bodies are CheckStep / GenerateStep / ShipStep / ShipPushing /
// ShippedStep, each with its own figma.ts; see screenGaps.ts for the shared reasons.
import { DERIVED, bindingGaps } from './screenGaps'

export const figma = {
  setId: '40000496:6698',
  name: 'MCP handoff',
  props: {
    Stepper: 'Stepper (Select / Check / Generate / Ship, current = state.step; all Done once pushed)',
    body: 'SelectStep: Selection card (SectionTitle, FigmaLinkCard, TicketRow), Connections card (ConnectionRow ×2), Actions bar',
    scenario: 'fixture for the selected frame (ready / not-ready / no-issue)',
  },
  figmaGaps: bindingGaps([
    'jira/border-width',
    'button/secondary/border-width',
    'button/primary/border-width',
    'button/primary/bg/default', 'button/primary/border/default', 'button/primary/gap', 'button/primary/height',
    'button/primary/padding-x', 'button/primary/radius',
    'button/secondary/bg/default', 'button/secondary/border/default', 'button/secondary/gap', 'button/secondary/height',
    'button/secondary/padding-x', 'button/secondary/radius',
    'jira/radius/control', 'jira/radius/row', 'jira/space/inline', 'jira/space/row-x', 'jira/space/row-y', 'jira/space/tight',
    'jira/surface/field', 'jira/surface/panel-border',
    'mcp/radius/control', 'mcp/space/row-x', 'mcp/space/row-y', 'mcp/surface/field',
  ]),
  derivedGaps: {
    '--bb-derived-mcp-handoff-button-change-selection-width': DERIVED.hug,
    '--bb-derived-mcp-handoff-button-next-check-width': DERIVED.hug,
    '--bb-derived-mcp-handoff-connection-row-height': DERIVED.height,
    '--bb-derived-mcp-handoff-connection-row-width': DERIVED.fill,
    '--bb-derived-mcp-handoff-figma-link-card-height': DERIVED.height,
    '--bb-derived-mcp-handoff-figma-link-card-width': DERIVED.fill,
    '--bb-derived-mcp-handoff-root-height': DERIVED.root,
    '--bb-derived-mcp-handoff-root-width': DERIVED.root,
    '--bb-derived-mcp-handoff-section-title-height': DERIVED.height,
    '--bb-derived-mcp-handoff-section-title-width': DERIVED.fill,
    '--bb-derived-mcp-handoff-stepper-height': DERIVED.height,
    '--bb-derived-mcp-handoff-stepper-width': DERIVED.fill,
    '--bb-derived-mcp-handoff-ticket-row-height': DERIVED.height,
    '--bb-derived-mcp-handoff-ticket-row-width': DERIVED.fill,
  },
  notes: 'Code follows Figma "MCP flow v2 · 600" on the MCP page (40000262:15380), the same layout as Publish v2: Stepper, one scrolling column of mcp/surface/panel cards, sticky Actions bar. The six happy-path bodies are manifest sets — McpHandoff = Select (40000496:6698), CheckStep (7041), GenerateStep (7353), ShipStep (7657), ShipPushing (7999), ShippedStep (8535). The empty states (section 40000497:7749) and error states (40000497:8630) reuse those bodies with PublishEmptyState cards (title/body/icon overrides) and are covered by stories, not manifest entries. Figma only draws the TicketRow.tsx tab\'s code; the .css and .stories.tsx contents are representative fixtures.',
} as const
