// Settings › Code repository / Jira: where the service lives, then one Connection card that
// connects by signing in or with a pasted token (Figma "Settings · 600 · Sign-in
// or token", 40003043:19074). A sign-in leaves its token in the same apiKey field
// a pasted token uses, so everything downstream reads one key either way. Like
// every other field, nothing is kept until the section is saved.
import { useEffect, useRef, useState } from 'preact/hooks'
import { Avatar, Button, Input, LinkButton, MetaBadge, Notice, SegmentedControl, Spinner } from '@shared/ui'
import { MAX_TEXT, bitbucketHost, githubHost, hostOf, isAtlassianCloud, jiraHost, tokenHelpUrl, type ConnectMethod } from '@shared/integrations'
import { pollSignIn, requestKeys, signInBroker, signInExpired, startUrl } from '@shared/integrations/signin'
import type { FieldContext } from './IntegrationField'
import type { ConnectionSpec } from './sections'

type Service = ConnectionSpec['service']
/** What the card connects to: the Code repository section is GitHub or Bitbucket (its `host` value). */
type Kind = Service | 'bitbucket'

const COPY: Readonly<Record<Kind, { where: string; placeholder: string; whereHelp: string; tokenOption: string; provider: string }>> = {
  github: { where: 'Where’s your GitHub?', placeholder: 'github.com', whereHelp: 'A repository link or your GitHub address. Blank for github.com.', tokenOption: 'Access token', provider: 'GitHub' },
  bitbucket: { where: 'Where’s your Bitbucket?', placeholder: 'bitbucket.org/workspace/repository', whereHelp: 'A repository link, or your Bitbucket Data Center address.', tokenOption: 'API token', provider: 'Bitbucket' },
  jira: { where: 'Where’s your Jira?', placeholder: 'yourteam.atlassian.net', whereHelp: 'A Jira link or your Jira address.', tokenOption: 'API token', provider: 'Atlassian' },
}

/** "Sign in" is greyed out with this until a broker exists for the person. */
export const SIGN_IN_UNAVAILABLE = 'Sign-in needs Bluebird Cloud (coming soon) or a company gateway. Use a token.'

type Flow = { kind: 'idle' } | { kind: 'waiting'; abort: AbortController; code?: string } | { kind: 'error'; message: string }

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const initials = (account: string): string => account.replace(/^@/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'

export function ConnectionCard({ spec, ctx, openExternal }: { spec: ConnectionSpec; ctx: FieldContext; openExternal: (url: string) => void }) {
  const { values, errors, onChange } = ctx
  const service = spec.service
  const kind: Kind = service === 'github' && values.host === 'bitbucket' ? 'bitbucket' : service
  const copy = COPY[kind]
  const isLocked = (key: string) => ctx.disabled || ctx.locked?.has(key) === true
  const [flow, setFlow] = useState<Flow>({ kind: 'idle' })
  const flowRef = useRef(flow)
  flowRef.current = flow
  useEffect(() => () => { const f = flowRef.current; if (f.kind === 'waiting') f.abort.abort() }, [])

  // Where the service is: GitHub keeps it in baseUrl ('' = github.com); Jira in siteUrl (Cloud) or baseUrl (Server / DC).
  const address = service === 'github' ? str(values.baseUrl) : str(values.baseUrl) || str(values.siteUrl)
  const setAddress = (v: string) => {
    if (service === 'github') { onChange('baseUrl', v); return }
    const cloud = isAtlassianCloud(v)
    onChange('siteUrl', cloud ? v : '')
    onChange('baseUrl', cloud ? '' : v)
  }
  const github = githubHost(str(values.baseUrl))
  const bitbucket = bitbucketHost(str(values.baseUrl))
  const jira = jiraHost(str(values.siteUrl), str(values.baseUrl))
  const code = kind === 'bitbucket' ? bitbucket : github
  const detected = service === 'github' ? code.label : jira?.label
  const web = service === 'github' ? code.web : jira?.site ?? ''
  const dataCenter = kind === 'bitbucket' && bitbucket.flavor === 'datacenter'

  const broker = signInBroker(str(values[service === 'github' ? 'gatewayUrl' : 'proxyUrl']))
  const method: ConnectMethod = values.method === 'signin' && broker ? 'signin' : 'token'
  const account = str(values.signinAccount)
  const expired = method === 'signin' && account !== '' && signInExpired(str(values.signinExpires))
  const connected = method === 'signin' && account !== '' && str(values.apiKey) !== '' && !expired

  const forget = () => {
    onChange('apiKey', ''); onChange('signinAccount', ''); onChange('signinExpires', '')
    if (service === 'jira') onChange('cloudId', '')
  }
  const setMethod = (next: ConnectMethod) => {
    // A sign-in token isn't something to show in the token field.
    if (next === 'token' && account) forget()
    onChange('method', next)
  }

  const signIn = async () => {
    if (!broker) return
    const abort = new AbortController()
    setFlow({ kind: 'waiting', abort })
    try {
      const keys = await requestKeys(broker, kind, { signal: abort.signal })
      setFlow({ kind: 'waiting', abort, code: keys.code })
      openExternal(startUrl(broker, kind, hostOf(web) || hostOf(code.web), keys.write))
      const result = await pollSignIn(broker, keys.read, { signal: abort.signal })
      onChange('apiKey', result.accessToken)
      onChange('signinAccount', result.account)
      onChange('signinExpires', result.expiresAt)
      // Jira Cloud: the site's id at api.atlassian.com, where the token is used. Code repository: a sign-in is a
      // Bearer token, so an Atlassian email left from token mode must not turn it into Basic auth.
      if (service === 'jira') onChange('cloudId', result.site?.cloudId ?? '')
      else onChange('email', '')
      onChange('method', 'signin')
      setFlow({ kind: 'idle' })
    } catch (error: unknown) {
      if (abort.signal.aborted) return
      setFlow({ kind: 'error', message: error instanceof Error ? error.message : 'Try again, or use a token.' })
    }
  }
  const cancel = () => { if (flow.kind === 'waiting') flow.abort.abort(); setFlow({ kind: 'idle' }) }

  const addressError = errors.baseUrl ?? errors.siteUrl
  return (
    <div class="bb-connection">
      <Input
        label={copy.where} icon="url" value={address} placeholder={copy.placeholder}
        helperText={addressError ?? copy.whereHelp} error={addressError !== undefined}
        disabled={isLocked('baseUrl') || isLocked('siteUrl')} maxLength={MAX_TEXT} autoComplete="off" spellcheck={false}
        onValueChange={setAddress}
      />
      {dataCenter && <Notice tone="info" title="Bitbucket Data Center is coming">Bluebird works with Bitbucket Cloud (bitbucket.org) for now.</Notice>}
      {expired && <Notice tone="error" title={`Your ${copy.provider} sign-in expired`}>Sign in again. Your settings are kept.</Notice>}
      {flow.kind === 'error' && <Notice tone="error" title="Sign-in didn’t finish">{flow.message}</Notice>}
      <div class="bb-connection__card" role="group" aria-label={`${service === 'github' ? copy.provider : 'Jira'} connection`}>
        <div class="bb-connection__head">
          <span class="bb-integrations__group-title">Connection</span>
          {detected && <MetaBadge tone="neutral">{detected}</MetaBadge>}
        </div>
        {!connected && (
          <SegmentedControl<ConnectMethod>
            class="bb-connection__method" aria-label="How to connect" value={method}
            options={[{ value: 'signin', label: 'Sign in', disabled: !broker }, { value: 'token', label: copy.tokenOption }]}
            disabled={flow.kind === 'waiting' || isLocked('method')} onChange={setMethod}
          />
        )}
        {!connected && !broker && <p class="bb-connection__caption">{SIGN_IN_UNAVAILABLE}</p>}
        {connected ? (
          <>
            <div class="bb-connection__row">
              <Avatar size="md" name={account}>{initials(account)}</Avatar>
              <div class="bb-connection__who">
                <span class="bb-integrations__group-title">Connected as {account}</span>
                <span class="bb-connection__caption">Signed in with {copy.provider}</span>
              </div>
              <Button variant="secondary" disabled={ctx.disabled} onClick={forget}>Disconnect</Button>
            </div>
            {/* A GitHub App only reaches repositories where it's installed; the broker knows the install page. */}
            {kind === 'github' && broker && <LinkButton onClick={() => openExternal(`${broker}/auth/github/install`)}>Install Bluebird on your organisation</LinkButton>}
          </>
        ) : method === 'signin' ? (
          flow.kind === 'waiting' ? (
            <div class="bb-connection__row" aria-live="polite">
              <Spinner tone="accent" />
              <div class="bb-connection__who">
                <span class="bb-integrations__group-title">Finish signing in in your browser</span>
                {flow.code && <span class="bb-connection__caption">Type <strong>{flow.code}</strong> in your browser</span>}
              </div>
              <Button variant="secondary" onClick={cancel}>Cancel</Button>
            </div>
          ) : (
            <>
              <Button class="bb-connection__signin" disabled={ctx.disabled} onClick={() => { void signIn() }}>{expired ? 'Sign in again' : `Sign in with ${copy.provider}`}</Button>
              <p class="bb-connection__caption">Recommended: no keys to copy or renew.</p>
            </>
          )
        ) : (
          <TokenFields kind={kind} ctx={ctx} cloud={service === 'jira' && jira?.flavor !== 'datacenter'}
            onHelp={() => openExternal(tokenHelpUrl(kind, web || code.web, jira?.flavor))} />
        )}
      </div>
    </div>
  )
}

function TokenFields({ kind, ctx, cloud, onHelp }: { kind: Kind; ctx: FieldContext; cloud: boolean; onHelp: () => void }) {
  const { values, errors, onChange } = ctx
  const field = (key: string, label: string, helper: string, secret: boolean, placeholder: string) => (
    <Input
      label={label} icon={secret ? 'api-key' : 'message'} password={secret} value={str(values[key])} placeholder={placeholder}
      helperText={errors[key] ?? helper} error={errors[key] !== undefined} disabled={ctx.disabled || ctx.locked?.has(key) === true}
      maxLength={MAX_TEXT} autoComplete={secret ? 'new-password' : 'off'} spellcheck={false} onValueChange={(v) => onChange(key, v)}
    />
  )
  return (
    <>
      {kind === 'github'
        ? field('apiKey', 'Access token', 'Needs Contents and Pull requests (write) and Actions (read).', true, 'github_pat_…')
        : kind === 'bitbucket'
          ? <>
              {field('email', 'Atlassian email', 'Bitbucket API tokens sign in with your Atlassian email, not your username.', false, 'you@company.com')}
              {field('apiKey', 'API token', 'Bitbucket scopes: Repositories and Pull requests (write), Pipelines (read).', true, 'ATATT…')}
            </>
        : cloud
          ? <div class="bb-integrations__row">
              {field('apiKey', 'API token', 'From id.atlassian.com › Security › API tokens.', true, '')}
              {field('email', 'Email', 'The email you sign in to Atlassian with.', false, 'you@company.com')}
            </div>
          : field('apiKey', 'Personal access token', 'In Jira: Profile › Personal access tokens.', true, '')}
      <LinkButton onClick={onHelp}>How to create {kind === 'github' ? 'a token' : kind === 'bitbucket' || cloud ? 'an API token' : 'a personal access token'}</LinkButton>
    </>
  )
}
