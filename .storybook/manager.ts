import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'

const BRAND_TITLE = 'The Bridge · Design Studio'

// The Bridge wordmark is white, so the manager stays on the dark base.
// The Home page carries its own header navigation, so it opens as a full-width
// website page; every other entry keeps the sidebar and toolbar.
const FULL_WIDTH_PAGES = new Set(['home--docs'])

addons.setConfig({
  theme: create({
    base: 'dark',
    brandTitle: BRAND_TITLE,
    brandImage: './brand/bridge.svg',
    brandTarget: '_self',
  }),
  layoutCustomisations: {
    showSidebar: (state, defaultValue) => (FULL_WIDTH_PAGES.has(state.storyId) ? false : defaultValue),
    showToolbar: (state, defaultValue) => (FULL_WIDTH_PAGES.has(state.storyId) ? false : defaultValue),
  },
})

// Storybook hardcodes "<story> ⋅ Storybook" as the tab title and exposes no
// option for it, so swap the suffix whenever the manager rewrites the title.
const STORYBOOK_SUFFIX = /\s⋅ Storybook$/

function rebrand(title: string): string {
  if (title === 'Storybook') return BRAND_TITLE
  return title.replace(STORYBOOK_SUFFIX, ` ⋅ ${BRAND_TITLE}`)
}

function syncTitle(): void {
  const next = rebrand(document.title)
  if (next !== document.title) document.title = next
}

new MutationObserver(syncTitle).observe(document.head, {
  childList: true,
  subtree: true,
  characterData: true,
})
syncTitle()
