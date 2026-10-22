import { AlertTriangle, KeyRound, RefreshCw, WifiOff } from 'lucide-react'
import type { GoogleAuthIssue } from '../services/googleAuth'

interface ServiceErrorStateProps {
  issue: GoogleAuthIssue
  busy?: boolean
  onPrimary: () => void
  onDisconnect: () => void
}

const BADGE_CLASS = {
  warn: 'status-badge status-badge-warn',
  danger: 'status-badge status-badge-danger',
  muted: 'status-badge status-badge-muted',
} as const

export function ServiceErrorState({ issue, busy = false, onPrimary, onDisconnect }: ServiceErrorStateProps) {
  const tone = issue.needsReconnect ? 'warn' : issue.kind === 'network' ? 'muted' : 'danger'
  const Icon = issue.needsReconnect ? KeyRound : issue.kind === 'network' ? WifiOff : AlertTriangle

  return (
    <div className="flex flex-col items-center justify-center h-full px-3 py-2 text-center animate-fade-in">
      <div className={`${BADGE_CLASS[tone]} mb-3.5`}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <h4 className="text-sm font-semibold text-text mb-1">{issue.title}</h4>
      <p className="text-xs text-text-secondary leading-relaxed max-w-[260px] mb-4">
        {issue.description}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrimary}
          disabled={busy}
          className="btn-primary text-xs !px-3.5 !py-1.5 flex items-center gap-1.5 disabled:opacity-70 disabled:pointer-events-none"
        >
          <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Working...' : issue.needsReconnect ? 'Reconnect' : 'Try again'}
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          disabled={busy}
          className="text-xs px-2.5 py-1.5 rounded-button text-text-muted hover:text-text hover:bg-surface transition-colors disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>
      {issue.raw && (
        <details className="mt-3 text-[10px] text-text-muted max-w-full">
          <summary className="cursor-pointer select-none hover:text-text-secondary transition-colors">
            Details
          </summary>
          <p className="mt-1 px-2 break-words opacity-80">{issue.raw}</p>
        </details>
      )}
    </div>
  )
}
