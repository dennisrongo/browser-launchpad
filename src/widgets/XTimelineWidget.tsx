import { useState, useEffect, useCallback, memo, useMemo } from 'react'
import { Twitter, AlertTriangle, RefreshCw, Settings, ExternalLink } from 'lucide-react'
import type { XTimelineWidgetConfig } from '../types'

interface XTimelineWidgetProps {
  title: string
  config: XTimelineWidgetConfig
}

interface Tweet {
  id: string
  authorName: string
  authorHandle: string
  authorProfileImage?: string
  text: string
  createdAt: string
  url: string
}

interface TimelineState {
  tweets: Tweet[]
  loading: boolean
  error: string | null
  authenticated: boolean
}

function formatRelativeTime(createdAt: string): string {
  try {
    const date = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return `${diffSec}s`
    if (diffMin < 60) return `${diffMin}m`
    if (diffHour < 24) return `${diffHour}h`
    if (diffDay < 7) return `${diffDay}d`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export const XTimelineWidget = memo(function XTimelineWidget({ title, config }: XTimelineWidgetProps) {
  const [state, setState] = useState<TimelineState>({
    tweets: [],
    loading: false,
    error: null,
    authenticated: false,
  })
  const [refreshing, setRefreshing] = useState(false)

  const getXCookies = useCallback(async (): Promise<{ authToken: string; ct0: string } | null> => {
    try {
      const cookies = await chrome.cookies.getAll({ domain: '.x.com' })
      const authToken = cookies.find((c) => c.name === 'auth_token')?.value
      const ct0 = cookies.find((c) => c.name === 'ct0')?.value
      if (!authToken || !ct0) return null
      return { authToken, ct0 }
    } catch {
      return null
    }
  }, [])

  const fetchTimeline = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) {
        setRefreshing(true)
      } else {
        setState((prev) => ({ ...prev, loading: true, error: null }))
      }

      try {
        const cookies = await getXCookies()
        if (!cookies) {
          setState((prev) => ({
            ...prev,
            loading: false,
            refreshing: false,
            error: null,
            authenticated: false,
            tweets: [],
          }))
          setRefreshing(false)
          return
        }

        const response = await chrome.runtime.sendMessage({
          type: 'FETCH_X_TIMELINE',
          cookies,
          timelineType: config.timelineType || 'following',
        })

        if (response?.success) {
          setState({
            tweets: response.tweets || [],
            loading: false,
            error: null,
            authenticated: true,
          })
        } else {
          setState({
            tweets: [],
            loading: false,
            error: response?.error || 'Failed to fetch timeline',
            authenticated: !(
              response?.error?.includes('Not authenticated') ||
              response?.error?.includes('log in')
            ),
          })
        }
      } catch {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to communicate with background worker',
        }))
      } finally {
        if (showRefreshSpinner) setRefreshing(false)
      }
    },
    [config.timelineType, getXCookies]
  )

  // Check auth on mount
  useEffect(() => {
    getXCookies().then((cookies) => {
      setState((prev) => ({ ...prev, authenticated: !!cookies }))
    })
  }, [getXCookies])

  // Fetch timeline on mount and when config changes
  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  // Auto-refresh interval
  useEffect(() => {
    const minutes = Math.max(1, Math.min(config.refreshMinutes || 5, 60))
    const intervalMs = minutes * 60 * 1000

    const interval = setInterval(() => {
      fetchTimeline()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [config.refreshMinutes, fetchTimeline])

  const getContent = useMemo(() => {
    if (!state.authenticated && !state.loading) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 px-2">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
            <Twitter className="w-6 h-6 text-secondary" />
          </div>
          <h3 className="text-sm font-semibold mb-1">{title}</h3>
          <p className="text-text-muted text-xs text-center mb-3">
            Please log in to{' '}
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              x.com
            </a>
          </p>
          <button
            onClick={() => fetchTimeline(true)}
            disabled={refreshing}
            className="p-2 text-neutral hover:text-secondary hover:bg-surface rounded-button transition-all duration-150 disabled:opacity-50"
            title="Check authentication"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )
    }

    if (state.loading) {
      return (
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
            <Twitter className="w-6 h-6 text-secondary animate-pulse" />
          </div>
          <h3 className="text-sm font-semibold mb-1">{title}</h3>
          <p className="text-neutral text-xs">Loading...</p>
        </div>
      )
    }

    if (state.error) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 px-2">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-sm font-semibold mb-1">{title}</h3>
          <p className="text-text-muted text-xs text-center text-red-500 mb-2">{state.error}</p>
          <button
            onClick={() => fetchTimeline(true)}
            disabled={refreshing}
            className="p-2 text-neutral hover:text-secondary hover:bg-surface rounded-button transition-all duration-150 disabled:opacity-50"
            title="Retry"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )
    }

    if (state.tweets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 px-2">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
            <Twitter className="w-6 h-6 text-secondary" />
          </div>
          <h3 className="text-sm font-semibold mb-1">{title}</h3>
          <p className="text-text-muted text-xs text-center mb-2">No tweets found</p>
          <button
            onClick={() => fetchTimeline(true)}
            disabled={refreshing}
            className="p-2 text-neutral hover:text-secondary hover:bg-surface rounded-button transition-all duration-150 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )
    }

    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-0 -mx-1 px-1">
        {state.tweets.map((tweet) => (
          <a
            key={tweet.id}
            href={tweet.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-2 py-2.5 hover:bg-surface/60 rounded-lg transition-colors duration-150 group"
          >
            <div className="flex items-start gap-2.5">
              {tweet.authorProfileImage ? (
                <img
                  src={tweet.authorProfileImage.replace('_normal', '_bigger')}
                  alt=""
                  className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Twitter className="w-3.5 h-3.5 text-text-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-sm font-semibold text-text truncate">
                    {tweet.authorName}
                  </span>
                  <span className="text-xs text-text-muted truncate">
                    @{tweet.authorHandle}
                  </span>
                  <span className="text-xs text-text-muted flex-shrink-0">
                    {formatRelativeTime(tweet.createdAt)}
                  </span>
                  <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 flex-shrink-0 ml-auto transition-opacity" />
                </div>
                <p className="text-sm text-text-secondary leading-snug mt-0.5 break-words whitespace-pre-wrap">
                  {tweet.text}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    )
  }, [state, refreshing, title, fetchTimeline])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-text-muted">
          {config.timelineType === 'foryou' ? 'For You' : 'Following'}
        </span>
        <button
          onClick={() => fetchTimeline(true)}
          disabled={refreshing}
          className="p-1.5 text-neutral hover:text-secondary hover:bg-surface rounded-button transition-all duration-150 disabled:opacity-50"
          title="Refresh timeline"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {getContent}
    </div>
  )
})
