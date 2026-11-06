import { scaleGaps } from '../../../shared/brand/scaleGaps'
import { tabSubMenuDerived, tabSubMenuGaps } from '../../../shared/ui/SegmentedControl/gaps'
/** Figma ↔ code contract for the Jira board body (frame, not a component set). */
const segment = 'Raw on the composed "Tab selecters" instance (SegmentTab); SegmentTab.css reads the same geometry from its own set (--bb-derived-segment-tab-*). Widths hug the label text.'
const row = 'Ticket Row instance (layer named by its issue key, i.e. data). TicketRow.css reads the set\'s own 60px height and stroke; in the board every row FILLs the list (width: 100%).'
const fill = 'FILL in Figma — the value is the 1074 mock\'s content box; code fills the panel at every plugin width.'
const hug = 'Hugs its label text (data); the composed component sizes itself.'
const composed = (c: string) => `Bound on the composed ${c} instance; ${c}.css consumes it.`

export const figma = {
  setId: '40000269:5322',
  name: 'Jira board',
  props: {
    'Ticket list': 'TicketList (header, "Scope tabs & search" → scope FilterSelect Dropdown + "Search toggle" / "Filter toggle" Buttons; "Search" SearchBar and "Filters" (three FilterSelect Dropdowns) are hidden in Figma and open below on demand; status groups of TicketRow)',
    'Ticket detail': 'TicketDetail (breadcrumb, title, Status FilterSelect + PointsPicker + PriorityIcon, Log work Button, FieldRows, SectionTitles, FigmaLinkCards, Checkboxes, ActivitySection)',
  },
  figmaGaps: {
    ...scaleGaps('button/secondary/border-width', 'input/border-width', 'space/inset-lg-alt'),
    ...tabSubMenuGaps(),
    'border/subtle': composed('MetaBadge ("Count")'), 'radius/pill': composed('MetaBadge ("Count")'),
    'space/inline-xs': composed('MetaBadge ("Count")'), 'space/inline-sm': composed('MetaBadge ("Count")'),
    'search-bar/bg/default': composed('SearchBar'), 'search-bar/border/default': composed('SearchBar'), 'search-bar/radius': composed('SearchBar'),
    'dropdown/bg/default': composed('Dropdown'), 'dropdown/border/default': composed('Dropdown'), 'dropdown/radius': composed('Dropdown'),
    'dropdown/gap': composed('Dropdown'), 'dropdown/padding-x': composed('Dropdown'), 'dropdown/height': composed('Dropdown'),
    'jira/row/bg/selected': composed('TicketRow'), 'jira/row/border/selected': composed('TicketRow'), 'jira/row/bg/hover': composed('TicketRow'),
    'jira/radius/row': composed('TicketRow'), 'jira/space/row-x': composed('TicketRow / FigmaLinkCard'), 'jira/space/row-y': composed('TicketRow / FigmaLinkCard'),
    'jira/type/epic': composed('IssueType'), 'jira/type/story': composed('IssueType'), 'jira/radius/icon': composed('IssueType'),
    'jira/points/bg': composed('StoryPoints'), 'jira/points/border': composed('StoryPoints'), 'jira/space/hair': composed('StoryPoints'),
    'button/secondary/bg/default': composed('Button ("Log work")'), 'button/secondary/border/default': composed('Button ("Log work")'),
    'button/secondary/radius': composed('Button ("Log work")'), 'button/secondary/gap': composed('Button ("Log work")'),
    'button/secondary/padding-x': composed('Button ("Log work")'), 'button/secondary/width-md': 'Log work hugs its label in the board so status, points, priority and the button fit one line; Button.css reads width-md for width="fixed".',
    'button/secondary/height': composed('Button ("Log work")'),
    'jira/surface/field': composed('FigmaLinkCard'), 'jira/radius/control': composed('FigmaLinkCard'),
    'checkbox/gap': composed('Checkbox'),
    'icon/glyph/default': 'Bound on the "Search toggle" glyph override; Button.css colours its icon with currentColor from the same token.',
  },
  derivedGaps: {
    ...tabSubMenuDerived('--bb-derived-jira-board-tab-sub-menu'),
    ...Object.fromEntries(['comments', 'history', 'work-log'].flatMap((tab) =>
      ['fill', 'stroke', 'stroke-width', 'height', 'width', 'radius', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left']
        .map((p) => `--bb-derived-jira-board-${tab}-${p}`))
      .filter((name) => !/(history|work-log)-(fill|stroke|stroke-width)$/.test(name))
      .map((name) => [name, segment])),
    ...Object.fromEntries(['131', '138', '155', '157', '160'].flatMap((k) => [`--bb-derived-jira-board-bb-${k}-height`, `--bb-derived-jira-board-bb-${k}-width`]).map((n) => [n, row])),
    '--bb-derived-jira-board-bb-142-width': row,
    '--bb-derived-jira-board-checkbox--1-width': hug, '--bb-derived-jira-board-checkbox--2-width': hug,
    '--bb-derived-jira-board-checkbox--3-width': hug, '--bb-derived-jira-board-checkbox-jira-board-width': hug,
    '--bb-derived-jira-board-checkbox-height': 'Checkbox hugs its 16px box; Checkbox.css sizes it.',
    '--bb-derived-jira-board-comment-composer-width': fill, '--bb-derived-jira-board-comment-composer-height': 'CommentComposer hugs its textarea and toolbar; the 80 is the instance\'s fixed mock height.',
    '--bb-derived-jira-board-comment-width': fill, '--bb-derived-jira-board-comment-height': 'Comment height depends on the body text (data).',
    '--bb-derived-jira-board-count-width': hug, '--bb-derived-jira-board-count-height': 'MetaBadge sizes itself.', '--bb-derived-jira-board-count-stroke-width': 'MetaBadge.css draws its own stroke.',
    '--bb-derived-jira-board-field-row-width': 'Each FieldRow column is half the detail (side by side from a 400 detail, stacked below) rather than the mock\'s 300.',
    '--bb-derived-jira-board-figma-link-card-height': 'FigmaLinkCard sizes itself.', '--bb-derived-jira-board-figma-link-card-stroke-width': 'FigmaLinkCard.css draws its own stroke.',
    '--bb-derived-jira-board-open-in-jira-width': hug, '--bb-derived-jira-board-open-in-jira-height': hug,
    '--bb-derived-jira-board-refresh-width': hug, '--bb-derived-jira-board-refresh-height': hug,
    '--bb-derived-jira-board-root-height': 'Desktop-mock height (724); the board fills the 360–760 plugin window\'s tab area instead.',
    '--bb-derived-jira-board-ticket-list-width': 'Fixed 309 in the 1074 mock = 30% of the content box; code sizes the list with a 30% / 70% flex basis so the split holds at every width.',
    '--bb-derived-jira-board-search-toggle-width': 'Icon-only Button hugs its padding and glyph (36); Button.css sizes it.',
    '--bb-derived-jira-board-filter-toggle-width': 'Icon-only Button hugs its padding and glyph (36); Button.css sizes it.',
    '--bb-derived-jira-board-filters-width': fill,
    '--bb-derived-jira-board-log-work-width': 'Log work hugs its label (Button without width="fixed").',
    '--bb-derived-jira-board-search-width': fill,
    '--bb-derived-jira-board-search-height': 'SearchBar.css reads search-bar/height.',
    '--bb-derived-jira-board-section-title-width': fill, '--bb-derived-jira-board-section-title-height': 'SectionTitle sizes itself.',
    '--bb-derived-jira-board-story-points-width': hug, '--bb-derived-jira-board-story-points-height': 'StoryPoints sizes itself.',
  },
  notes: 'Body frame of "Jira UI" (40000259:12617), a 1074×724 desktop mock. Code keeps its structure (list + detail, same paddings/gaps) but splits them 30 / 70 instead of 380 + fill, and caps the root at the mock width; search and Status / Sprint / Priority are collapsed behind icon toggles beside the scope Dropdown (hidden layers in Figma), so the list opens on the current sprint — the toggles use `tool-search` and `extract` (Tab Icons has no filter glyph yet); ticket rows and the Assignee / Reporter FieldRows drop their Avatars (showAssignee / showAvatar false, product call 2026-10-11); in a list under 280 wide the filters stack and rows hide the status badge; below a 720px container the panels stack and the list scrolls at five rows. Activity tabs are a plain row of "Tab selecters" in Figma (not the Group Tab selecters track), so they compose SegmentTab directly (TabStrip). The scope (Assigned to me / Reported / Watching) is the "Scope tabs & search" Dropdown (Type=Multi, Value "selected" in the mock); code keeps a single scope, so it is a single-select FilterSelect — Multi and Single look identical. UI only: data is fixtures.ts; Connect / Retry / status / points / subtasks / comments change local signals. "Jira UI · API scope" (40000271:7206) drops Subtasks and the comment file-attach icon; code keeps the main screen.',
} as const
