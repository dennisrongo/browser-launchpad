import { useState, useEffect, useCallback, memo, useMemo } from 'react'
import { Twitter, AlertTriangle, RefreshCw, Pause, Play, RotateCcw, ExternalLink } from 'lucide-react'
import type { XTimelineWidgetConfig, XTweet } from '../types'

interface XTimelineWidgetProps {
  title: string
  config: XTimelineWidgetConfig
}

interface TimelineState {
  tweets: XTweet[]
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

const URL_REGEX = /(https?:\/\/[^\s]+)|(@\w+)/g

function renderTweetText(text: string) {
  const parts = text.split(URL_REGEX)
  return parts.map((part, index) => {
    if (!part) return null
    if (part.startsWith('http')) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    if (part.startsWith('@')) {
      const username = part.slice(1)
      return (
        <a
          key={index}
          href={`https://x.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return part
  })
}

function NestedTweet({ tweet }: { tweet: XTweet }) {
  if (!tweet.text && !tweet.authorHandle) return null

  return (
    <div className="mt-2 ml-2 pl-3 border-l-2 border-border/60">
      <div className="flex items-center gap-1.5 min-w-0">
        <a
          href={`https://x.com/${tweet.authorHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0"
        >
          {tweet.authorProfileImage ? (
            <img
              src={tweet.authorProfileImage.replace('_normal', '_mini')}
              alt=""
              className="w-4 h-4 rounded-full"
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-surface flex items-center justify-center">
              <Twitter className="w-2 h-2 text-text-muted" />
            </div>
          )}
        </a>
        <a
          href={`https://x.com/${tweet.authorHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-text-secondary truncate hover:underline"
        >
          {tweet.authorName}
        </a>
        <a
          href={`https://x.com/${tweet.authorHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-text-muted truncate hover:underline"
        >
          @{tweet.authorHandle}
        </a>
        {tweet.createdAt && (
          <span className="text-[10px] text-text-muted flex-shrink-0">
            {formatRelativeTime(tweet.createdAt)}
          </span>
        )}
      </div>
      {tweet.text && (
        <p className="text-xs text-text-muted leading-snug mt-0.5 break-words line-clamp-2">
          {renderTweetText(tweet.text)}
        </p>
      )}
    </div>
  )
}

export const XTimelineWidget = memo(function XTimelineWidget({ title, config }: XTimelineWidgetProps) {
  const [state, setState] = useState<TimelineState>({
    tweets: [],
    loading: false,
    error: null,
    authenticated: false,
  })
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const tweetsPerPage = Math.max(1, Math.min(10, config.tweetsPerPage || 3))
  const scrollIntervalSeconds = Math.max(3, Math.min(30, config.scrollIntervalSeconds || 5))

  const totalPages = useMemo(() => {
    return Math.ceil(state.tweets.length / tweetsPerPage)
  }, [state.tweets.length, tweetsPerPage])

  const visibleTweets = useMemo(() => {
    const start = currentPage * tweetsPerPage
    return state.tweets.slice(start, start + tweetsPerPage)
  }, [state.tweets, currentPage, tweetsPerPage])

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
          setCurrentPage(0)
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

  useEffect(() => {
    getXCookies().then((cookies) => {
      setState((prev) => ({ ...prev, authenticated: !!cookies }))
    })
  }, [getXCookies])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  useEffect(() => {
    const minutes = Math.max(1, Math.min(config.refreshMinutes || 5, 60))
    const intervalMs = minutes * 60 * 1000

    const interval = setInterval(() => {
      fetchTimeline()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [config.refreshMinutes, fetchTimeline])

  useEffect(() => {
    if (isPaused || state.tweets.length === 0 || totalPages <= 1) return

    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages)
    }, scrollIntervalSeconds * 1000)

    return () => clearInterval(interval)
  }, [isPaused, totalPages, scrollIntervalSeconds, state.tweets.length])

  const handleReset = useCallback(() => {
    setCurrentPage(0)
  }, [])

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => !prev)
  }, [])

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
      <>
        <div className="flex-1 overflow-hidden">
          {visibleTweets.map((tweet) => (
            <div
              key={tweet.id}
              className="px-2 py-2.5 hover:bg-surface/60 rounded-lg transition-colors duration-150 group"
            >
              <div className="flex items-start gap-2.5">
                <a
                  href={`https://x.com/${tweet.authorHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 mt-0.5"
                >
                  {tweet.authorProfileImage ? (
                    <img
                      src={tweet.authorProfileImage.replace('_normal', '_bigger')}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                      <Twitter className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                  )}
                </a>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <a
                      href={`https://x.com/${tweet.authorHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-text truncate hover:underline"
                    >
                      {tweet.authorName}
                    </a>
                    <a
                      href={`https://x.com/${tweet.authorHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-text-muted truncate hover:underline"
                    >
                      @{tweet.authorHandle}
                    </a>
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {formatRelativeTime(tweet.createdAt)}
                    </span>
                    <a
                      href={tweet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-text-muted hover:text-primary rounded-button transition-all duration-150 opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="Open tweet"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {tweet.replyTo && (
                    <p className="text-[10px] text-text-muted mb-0.5">
                      Replying to @{tweet.replyTo.authorHandle}
                    </p>
                  )}
                  <p className="text-sm text-text-secondary leading-snug mt-0.5 break-words line-clamp-3">
                    {renderTweetText(tweet.text)}
                  </p>
                  {tweet.quotedTweet && <NestedTweet tweet={tweet.quotedTweet} />}
                </div>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border/50">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  i === currentPage
                    ? 'bg-primary w-3'
                    : 'bg-text-muted/30 hover:bg-text-muted/50'
                }`}
                title={`Page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </>
    )
  }, [state, refreshing, title, fetchTimeline, visibleTweets, currentPage, totalPages])

  const showPaginationControls = state.tweets.length > 0 && !state.loading && !state.error && state.authenticated

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-text-muted">
          {config.timelineType === 'foryou' ? 'For You' : 'Following'}
        </span>
        <div className="flex items-center gap-1">
          {showPaginationControls && totalPages > 1 && (
            <>
              <button
                onClick={handleTogglePause}
                className="p-1.5 text-neutral hover:text-secondary hover:bg-surface rounded-button transition-all duration-150"
                title={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 text-neutral hover:text-secondary hover:bg-surface rounded-button transition-all duration-150"
                title="Reset to first page"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => fetchTimeline(true)}
            disabled={refreshing}
            className="p-1.5 text-neutral hover:text-secondary hover:bg-surface rounded-button transition-all duration-150 disabled:opacity-50"
            title="Refresh timeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {getContent}
    </div>
  )
})
