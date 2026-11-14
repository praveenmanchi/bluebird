import { SCREEN, composedBy, instanceBox } from '../../../shared/brand/screenGaps'

// Figma ↔ code contract for the History tab's "History · 1 Timeline" screen: a frame, not a component set.
// The tab renders it from state (Tab.tsx) and it is checked against history.css.
export const figma = {
  setId: '40002705:6666',
  name: 'History',
  props: {},
  figmaGaps: {
    ...composedBy('Button', ['button/primary/bg/default', 'button/primary/border-width', 'button/primary/border/default', 'button/primary/gap', 'button/primary/height', 'button/primary/padding-x', 'button/primary/radius', 'button/secondary/bg/default', 'button/secondary/border-width', 'button/secondary/border/default', 'button/secondary/gap', 'button/secondary/height', 'button/secondary/padding-x', 'button/secondary/radius']),
    ...composedBy('Dropdown, Tab sub menu', ['dropdown/border/default']),
    ...composedBy('Dropdown', ['dropdown/bg/default', 'dropdown/gap', 'dropdown/height', 'dropdown/padding-x', 'dropdown/radius']),
    ...composedBy('Meta Badge', ['feedback/success', 'radius/pill', 'space/inline-sm', 'space/inline-xs', 'space/inset-xs']),
    ...composedBy('Tab sub menu', ['dimension/space/2', 'dimension/space/4', 'dropdown/menu/bg']),
  },
  derivedGaps: {
    '--bb-derived-history-timeline-root-width': SCREEN.root,
    '--bb-derived-history-timeline-root-height': SCREEN.root,
    '--bb-derived-history-timeline-frame-1430102629-gap': 'An unnamed wrapper in the History toolbar with a raw 25 gap around a single child; the toolbar rows in code read the header gap. Name the layer or remove the wrapper in Figma.',
    '--bb-derived-history-timeline-actions-width': SCREEN.fill,
    ...instanceBox('Button', ['--bb-derived-history-timeline-button--1-width', '--bb-derived-history-timeline-button-history-width']),
    ...instanceBox('Dropdown', ['--bb-derived-history-timeline-dropdown-width']),
    ...instanceBox('History Entry', ['--bb-derived-history-timeline-history-entry--1-width', '--bb-derived-history-timeline-history-entry--2-width', '--bb-derived-history-timeline-history-entry--3-width', '--bb-derived-history-timeline-history-entry--4-width', '--bb-derived-history-timeline-history-entry--5-width', '--bb-derived-history-timeline-history-entry--6-width', '--bb-derived-history-timeline-history-entry--7-width', '--bb-derived-history-timeline-history-entry-height', '--bb-derived-history-timeline-history-entry-history-width']),
    ...instanceBox('Meta Badge', ['--bb-derived-history-timeline-github-status-height', '--bb-derived-history-timeline-github-status-width']),
    ...instanceBox('Section Title', ['--bb-derived-history-timeline-section-title--1-width', '--bb-derived-history-timeline-section-title--2-width', '--bb-derived-history-timeline-section-title--3-width', '--bb-derived-history-timeline-section-title-height', '--bb-derived-history-timeline-section-title-history-width']),
    ...instanceBox('Tab sub menu', ['--bb-derived-history-timeline-tab-sub-menu-height', '--bb-derived-history-timeline-tab-sub-menu-width']),
  },
  notes: 'Body of \'History · 1 Timeline\' on the History page. Top-level layers: Panels, Actions.',
} as const
