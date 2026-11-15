import { CheckItem, CodeSnippet, ColorSwatch, LinkButton, StatusPill } from '@shared/ui'
import { copyText } from '@shared/clipboard'
import { plural } from '../model'
import { changes, notice } from '../state'
import type { ComponentDoc, SectionId } from '../types'

function relative(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${plural(hours, 'hour')} ago` : `${plural(Math.round(hours / 24), 'day')} ago`
}

function Anatomy({ doc }: { doc: ComponentDoc }) {
  return (
    <>
      <h3 class="bb-docs__heading">Anatomy</h3>
      <div class="bb-docs__stage">
        <div class="bb-docs__specimen">
          {doc.preview
            ? <img src={doc.preview} alt={`${doc.name}, default variant`} />
            : <span class="bb-docs__specimen-name">{doc.name}</span>}
          {doc.anatomy.map((p) => (
            <span key={p.n} class="bb-docs__marker" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} aria-hidden="true">{p.n}</span>
          ))}
        </div>
      </div>
      <ol class="bb-docs__parts">
        {doc.anatomy.map((p) => (
          <li key={p.n}><span class="bb-docs__marker bb-docs__marker--inline" aria-hidden="true">{p.n}</span><strong>{p.name}</strong><span>{p.detail}</span></li>
        ))}
      </ol>
    </>
  )
}

function Tokens({ doc }: { doc: ComponentDoc }) {
  const copy = () => { void copyText(doc.tokens.map((t) => t.name).join('\n')).then((ok) => { notice.value = ok ? 'Token list copied' : 'Couldn’t copy the token list.' }) }
  return (
    <>
      <div class="bb-docs__row-head"><h3 class="bb-docs__heading">Tokens used</h3><LinkButton onClick={copy}>Copy list</LinkButton></div>
      {doc.tokens.length === 0 && <p class="bb-docs__hint">No variables are bound on this component’s own layers.</p>}
      <ul class="bb-docs__tokens">
        {doc.tokens.map((t) => (
          <li key={`${t.name}|${t.role}|${t.layer}`}>
            {t.kind === 'color' ? <ColorSwatch size="large" color={t.value} label={t.value} /> : <span class="bb-docs__number" aria-hidden="true">{t.value}</span>}
            <div>
              <strong>{t.name}</strong>
              <span>{t.role} · {t.layer}{t.alias ? ` · → ${t.alias}` : ''} · {t.value}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

export interface ComponentResultProps {
  doc: ComponentDoc
}

/** Figma "Docs · Components · 4 Result" and "5 Out of date": the generated doc, section by section. */
export function ComponentResult({ doc }: ComponentResultProps) {
  const has = (id: SectionId) => doc.sections.includes(id)
  const stale = changes.value
  return (
    <section class="bb-docs__card" aria-label={`${doc.name} documentation`}>
      <div class="bb-docs__row-head">
        <div class="bb-docs__title">
          <h2>{doc.name}</h2>
          <p>{stale.length ? `${doc.name} changed after this doc was made ${relative(doc.generatedAt)}` : `Generated ${relative(doc.generatedAt)} from ${doc.version}${doc.brands.length ? ` · ${plural(doc.brands.length, 'brand')}` : ''}`}</p>
        </div>
        <StatusPill status={stale.length ? 'issue' : 'good'}>{stale.length ? 'Out of date' : 'Up to date'}</StatusPill>
      </div>
      {stale.length > 0 && <CheckItem status="warning" title={`${plural(stale.length, 'change')} since ${doc.version}`} detail={stale.join(' · ')} showAction={false} />}
      {has('anatomy') && <Anatomy doc={doc} />}
      {has('properties') && (
        <>
          <h3 class="bb-docs__heading">Properties and variants</h3>
          <dl class="bb-docs__facts">
            {doc.properties.map((p) => <div key={p.name}><dt>{p.name}</dt><dd>{p.value}</dd></div>)}
          </dl>
        </>
      )}
      {has('tokens') && <Tokens doc={doc} />}
      {has('brands') && (
        <>
          <h3 class="bb-docs__heading">Brand differences{doc.brandDiff ? ` · ${doc.brandDiff.token}` : ''}</h3>
          {doc.brandDiff
            ? (
              <ul class="bb-docs__brands">
                {doc.brandDiff.values.map((v) => <li key={v.brand}><ColorSwatch size="large" color={v.value} label={`${v.brand} ${v.value}`} /><strong>{v.brand}</strong><span>{v.value}</span></li>)}
              </ul>
            )
            : <p class="bb-docs__hint">Every colour token on this component has the same value in each brand.</p>}
        </>
      )}
      {has('a11y') && (
        <>
          <h3 class="bb-docs__heading">Accessibility</h3>
          <div class="bb-docs__checks">
            {doc.checks.map((c) => <CheckItem key={c.title} status={c.status} title={c.title} detail={c.detail} showAction={false} />)}
          </div>
        </>
      )}
      {has('code') && doc.code && (
        <>
          <h3 class="bb-docs__heading">Code</h3>
          <CodeSnippet code={doc.code} language="TSX" />
        </>
      )}
    </section>
  )
}
