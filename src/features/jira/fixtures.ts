// Sample data for the UI-only Jira board. BB-142 and the six ticket rows copy
// the Figma "Jira board" frame (40000269:5322) word for word; the other
// tickets' detail (descriptions, links, activity) is filler in the same voice
// so selecting them shows a full detail panel.
import type { Person, Ticket } from './types'

export type { ActivityEntry, FigmaLink, Person, Subtask, Ticket, TicketScope, TicketStatus } from './types'

export const ME: Person = { name: 'Praveen Manchi', initials: 'PM' }
export const ANIKA: Person = { name: 'Anika Kumar', initials: 'AK' }
const RAHUL: Person = { name: 'Rahul Verma', initials: 'RV' }

const EPIC = { key: 'BB-100', title: 'Multi-brand plugin', type: 'epic' } as const

/** The site "Open in Jira" points at in mock mode; live data uses Settings › Site URL. */
export const SAMPLE_SITE = 'https://your-site.atlassian.net'

/** Figma "Synced 2m ago · Refresh". */
export const SYNCED_LABEL = 'Synced 2m ago'

/** The sprint the board opens on in mock mode (live data: the active sprint). */
export const CURRENT_SPRINT = 'Sprint 42'

export const STORY_POINT_OPTIONS = [1, 2, 3, 5, 8, 13] as const

export const TICKETS: readonly Ticket[] = [
  {
    key: 'BB-142',
    title: 'Jira tab: ticket list and detail view in Brand UI',
    type: 'story', status: 'in-progress', priority: 'high', points: 5,
    assignee: ME, reporter: ANIKA,
    sprint: 'Sprint 42', sprintEnds: 'Oct 17', labels: ['design-system', 'a11y'],
    dueDate: 'Oct 17, 2026', fixVersion: 'v2.12.0', parent: EPIC,
    description: 'Designers need to see and update their Jira issues without leaving Figma. List the issues assigned to the signed-in user and let them change status, estimate story points, comment and link Figma frames. Every value comes from Brand UI tokens, so the tab follows the selected brand.',
    links: [
      { id: 'l1', nodeId: '40000259:12617', frame: 'Jira UI', path: 'Plugin UI › jira' },
      { id: 'l2', nodeId: '40000267:8038', frame: 'Ticket Row / State=Selected', path: 'Plugin UI › Components › Jira' },
    ],
    subtasks: [
      { id: 's1', label: 'Ticket list layout', done: true },
      { id: 's2', label: 'Ticket detail layout', done: true },
      { id: 's3', label: 'Wire Jira REST search (JQL)', done: false },
      { id: 's4', label: 'Write back comments and points', done: false },
    ],
    comments: [
      { id: 'c1', author: ANIKA, time: '2 hours ago', body: 'Dev handoff is blocked on the hover state. Can you attach the frame for Brand=Ikea so I can check the focus ring token?' },
    ],
    history: [
      { id: 'h1', author: ME, time: 'Yesterday', body: 'changed Status from To do to In progress' },
      { id: 'h2', author: ANIKA, time: '3 days ago', body: 'created the issue' },
    ],
    worklog: [
      { id: 'w1', author: ME, time: 'Yesterday', body: 'Logged 3h — ticket list layout' },
    ],
    scopes: ['assigned', 'watching'],
  },
  {
    key: 'BB-138',
    title: 'Focus ring disappears on Dropdown in Ikea mode',
    type: 'bug', status: 'in-progress', priority: 'highest', points: 3,
    assignee: ME, reporter: ANIKA,
    sprint: 'Sprint 42', sprintEnds: 'Oct 17', labels: ['a11y', 'ikea'],
    dueDate: 'Oct 14, 2026', fixVersion: 'v2.12.0', parent: EPIC,
    description: 'With Brand=Ikea the Dropdown loses its focus ring when it is reached by keyboard. The focus border token resolves to the field border colour in that mode.',
    links: [{ id: 'l1', nodeId: '40000047:5292', frame: 'Dropdown / State=Open', path: 'Plugin UI › Components' }],
    subtasks: [{ id: 's1', label: 'Reproduce in Ikea mode', done: true }, { id: 's2', label: 'Rebind border/focus', done: false }],
    comments: [],
    history: [{ id: 'h1', author: ANIKA, time: '2 days ago', body: 'created the issue' }],
    worklog: [],
    scopes: ['assigned', 'watching'],
  },
  {
    key: 'BB-131',
    title: 'Bind WCAG card line-heights to Semantics tokens',
    type: 'task', status: 'in-review', priority: 'medium', points: 2,
    assignee: ME, reporter: ME,
    sprint: 'Sprint 42', sprintEnds: 'Oct 17', labels: ['design-system'],
    dueDate: 'Oct 12, 2026', fixVersion: 'v2.12.0', parent: EPIC,
    description: 'The WCAG card still carries raw line-heights. Bind them to the Semantics type scale so a brand switch reaches every text layer.',
    links: [],
    subtasks: [],
    comments: [{ id: 'c1', author: RAHUL, time: 'Yesterday', body: 'Looks good in Bridge and Disney. Checking Fiskars next.' }],
    history: [{ id: 'h1', author: ME, time: 'Yesterday', body: 'changed Status from In progress to In review' }],
    worklog: [{ id: 'w1', author: ME, time: '2 days ago', body: 'Logged 1h 30m — line-height bindings' }],
    scopes: ['assigned', 'reported'],
  },
  {
    key: 'BB-155',
    title: 'Storybook docs page for the Ticket Row molecule',
    type: 'story', status: 'todo', priority: 'medium', points: 8,
    assignee: ME, reporter: ME,
    sprint: 'Sprint 42', sprintEnds: 'Oct 17', labels: ['storybook'],
    dueDate: 'Oct 17, 2026', fixVersion: 'v2.12.0', parent: EPIC,
    description: 'Document the Ticket Row states (Default, Hover, Selected) with a controls panel and a brand switcher.',
    links: [{ id: 'l1', nodeId: '40000267:8055', frame: 'Ticket Row', path: 'Plugin UI › Components › Jira' }],
    subtasks: [],
    comments: [],
    history: [{ id: 'h1', author: ME, time: '4 days ago', body: 'created the issue' }],
    worklog: [],
    scopes: ['assigned', 'reported'],
  },
  {
    key: 'BB-157',
    title: 'Export Jira glyphs to figma/icons.json',
    type: 'subtask', status: 'todo', priority: 'low', points: 1,
    assignee: ME, reporter: ANIKA,
    sprint: 'Sprint 42', sprintEnds: 'Oct 17', labels: ['icons'],
    dueDate: 'Oct 16, 2026', fixVersion: 'v2.12.0', parent: EPIC,
    description: 'Add the issue-type and priority glyphs to the icon export so the plugin bundle ships them.',
    links: [],
    subtasks: [],
    comments: [],
    history: [{ id: 'h1', author: ANIKA, time: '4 days ago', body: 'created the issue' }],
    worklog: [],
    scopes: ['assigned'],
  },
  {
    key: 'BB-160',
    title: 'Multi-brand design QA for the Q4 release',
    type: 'epic', status: 'todo', priority: 'lowest', points: 13,
    assignee: ME, reporter: RAHUL,
    sprint: 'Sprint 42', sprintEnds: 'Oct 17', labels: ['qa', 'design-system'],
    dueDate: 'Oct 31, 2026', fixVersion: 'v2.13.0', parent: EPIC,
    description: 'Walk every screen in all five brands before the Q4 release and file what drifts.',
    links: [],
    subtasks: [],
    comments: [],
    history: [{ id: 'h1', author: RAHUL, time: '1 week ago', body: 'created the issue' }],
    worklog: [],
    scopes: ['assigned', 'watching'],
  },
  {
    key: 'BB-119',
    title: 'Settings: store the Jira site URL and API token',
    type: 'story', status: 'done', priority: 'high', points: 3,
    assignee: RAHUL, reporter: ME,
    sprint: 'Sprint 41', sprintEnds: 'Oct 3', labels: ['settings'],
    dueDate: 'Oct 3, 2026', fixVersion: 'v2.11.0', parent: EPIC,
    description: 'Let the designer paste their Atlassian site URL and API token once; keep them in client storage.',
    links: [],
    subtasks: [],
    comments: [],
    history: [{ id: 'h1', author: RAHUL, time: '1 week ago', body: 'changed Status from In review to Done' }],
    worklog: [],
    scopes: ['reported'],
  },
]

/** What `jira:selection` returns in mock mode — a frame the designer could attach. */
export const SAMPLE_SELECTION = { nodeId: '40000269:5516', frame: 'Ticket detail', path: 'Plugin UI › jira', url: 'https://www.figma.com/design/JPZ7koqomjcjczGQuhIMVH/?node-id=40000269-5516' } as const
