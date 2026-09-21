// Shared primitives. Hand-built on Tailwind only (single-file build, no CDN).
// Visual spec matches the DS Reviewer design system; brand colors come from
// tokens (bg-brand etc.) so a brand switch re-skins every tab at once.
import type { ComponentChildren, JSX } from 'preact'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'icon'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ComponentChildren
  children?: ComponentChildren
}

const buttonVariant: Record<ButtonVariant, string> = {
  primary: 'bg-brand hover:bg-brand-hover text-white',
  secondary: 'bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200',
  ghost: 'bg-transparent hover:bg-zinc-100 text-zinc-600',
  danger: 'bg-danger hover:bg-red-700 text-white',
}
const buttonSize: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[11px] rounded-sm',
  md: 'h-8 px-3 text-[12px] rounded-md',
  lg: 'h-9 px-4 text-[13px] rounded-md',
}

export function Button({ variant = 'primary', size = 'md', loading = false, icon, children, disabled, class: cls, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      class={`inline-flex items-center justify-center gap-1.5 font-medium transition-colors select-none ${buttonVariant[variant]} ${buttonSize[size]} ${disabled || loading ? 'opacity-40 cursor-not-allowed' : ''} ${cls ?? ''}`}
    >
      {loading ? <Spinner size={12} /> : icon}
      {children}
    </button>
  )
}

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  suffix?: ComponentChildren
}

export function Input({ error, suffix, class: cls, ...rest }: InputProps) {
  return (
    <div class="relative">
      <input
        {...rest}
        class={`h-8 w-full px-2.5 ${suffix ? 'pr-9' : ''} text-[12px] bg-white rounded-md border outline-none transition-colors placeholder:text-zinc-400 disabled:bg-zinc-100 ${error ? 'border-danger' : 'border-zinc-200 hover:border-zinc-400 focus:border-brand'} ${cls ?? ''}`}
      />
      {suffix && <div class="absolute inset-y-0 right-2.5 flex items-center text-zinc-400">{suffix}</div>}
    </div>
  )
}

export interface CardProps { padding?: 'none' | 'sm' | 'md'; class?: string; children?: ComponentChildren }
export function Card({ padding = 'md', class: cls, children }: CardProps) {
  const pad = { none: '', sm: 'p-3', md: 'p-4' }[padding]
  return <div class={`bg-white border border-zinc-200 rounded-lg ${pad} ${cls ?? ''}`}>{children}</div>
}

type BadgeVariant = 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'
const badgeVariant: Record<BadgeVariant, string> = {
  default: 'bg-zinc-100 text-zinc-600',
  blue: 'bg-brand-soft text-brand-hover',
  green: 'bg-success-bg text-success',
  yellow: 'bg-warning-bg text-amber-600',
  red: 'bg-danger-bg text-danger',
  purple: 'bg-purple-50 text-purple-600',
}
export function Badge({ variant = 'default', children }: { variant?: BadgeVariant; children?: ComponentChildren }) {
  return <span class={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${badgeVariant[variant]}`}>{children}</span>
}

type AlertVariant = 'info' | 'success' | 'warning' | 'error'
const alertStyle: Record<AlertVariant, { box: string; icon: string }> = {
  info: { box: 'bg-brand-soft border-info-border text-info-text', icon: 'ℹ' },
  success: { box: 'bg-success-bg border-success-border text-success', icon: '✓' },
  warning: { box: 'bg-warning-bg border-warning-border text-warning', icon: '!' },
  error: { box: 'bg-danger-bg border-danger-border text-danger', icon: '✕' },
}
export function Alert({ variant = 'info', title, children }: { variant?: AlertVariant; title?: string; children?: ComponentChildren }) {
  const s = alertStyle[variant]
  return (
    <div class={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${s.box}`} role="status">
      <span class="text-[11px] font-semibold leading-relaxed">{s.icon}</span>
      <div class="text-[11px] leading-relaxed opacity-90">
        {title && <div class="font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  )
}

export interface SegmentedOption<T extends string> { value: T; label: string }
export function SegmentedControl<T extends string>({ value, options, onChange }: { value: T; options: readonly SegmentedOption<T>[]; onChange: (v: T) => void }) {
  return (
    <div class="bg-zinc-100 rounded-md p-0.5 flex gap-0.5" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          class={`flex-1 px-2.5 py-1 text-[11px] rounded-sm transition-colors ${o.value === value ? 'bg-white shadow-sm text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg class="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.2" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    </svg>
  )
}

export function EmptyState({ icon, title, description }: { icon?: string; title: string; description?: string }) {
  return (
    <div class="flex flex-col items-center text-center py-8 px-4 gap-1">
      {icon && <div class="text-[28px] text-fg-muted mb-1">{icon}</div>}
      <div class="text-[12px] font-semibold text-fg">{title}</div>
      {description && <div class="text-[11px] text-fg-muted">{description}</div>}
    </div>
  )
}

export function Divider() { return <hr class="border-0 border-t border-zinc-200" /> }
