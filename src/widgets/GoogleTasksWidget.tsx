import { logger } from '../utils/logger'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ListTodo, RefreshCw, Link2, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import type { GoogleTasksWidgetConfig, GoogleTask, GoogleTaskList } from '../types'
import {
  initiateGoogleTasksAuth,
  getTasksAccessToken,
  fetchGoogleTaskLists,
  fetchGoogleTasks,
  createGoogleTask,
  updateGoogleTask,
  deleteGoogleTask,
  disconnectGoogleTasks,
  reconnectGoogleTasks,
} from '../services/googleTasks'
import { describeAuthError, onGoogleAuthRestored } from '../services/googleAuth'
import { ServiceErrorState } from '../components/ServiceErrorState'
import { UpdatedAgo } from '../components/UpdatedAgo'
import {
  invalidateWidgetCacheType,
  patchWidgetCache,
  readWidgetCache,
  widgetCacheKey,
  writeWidgetCache,
} from '../services/widgetCache'

interface GoogleTasksWidgetProps {
  widgetId: string
  title: string
  config: GoogleTasksWidgetConfig
  onConfigChange?: (newConfig: GoogleTasksWidgetConfig) => void
}

export function GoogleTasksWidget({ widgetId, title, config, onConfigChange }: GoogleTasksWidgetProps) {
  const selectedTaskListId = config.selectedTaskListId
  const showCompleted = config.showCompleted ?? true
  const cacheKey = widgetCacheKey('google-tasks', widgetId, selectedTaskListId, showCompleted)

  const [initialHit] = useState(() =>
    config.googleConnected && selectedTaskListId ? readWidgetCache<GoogleTask[]>(cacheKey) : null
  )
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([])
  const [tasks, setTasks] = useState<GoogleTask[]>(() => initialHit?.data ?? [])
  const [fetchedAt, setFetchedAt] = useState<number | null>(initialHit?.fetchedAt ?? null)
  const [initialLoading, setInitialLoading] = useState(!initialHit)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const fetchIdRef = useRef(0)
  const skipFreshMountRef = useRef(!!initialHit?.fresh)

  const applyTasks = (update: (prev: GoogleTask[]) => GoogleTask[]) => {
    setTasks(update)
    patchWidgetCache<GoogleTask[]>(cacheKey, update)
  }

  const loadTasks = useCallback(async (silent = false) => {
    if (!config.googleConnected || !selectedTaskListId) {
      setTasks([])
      setInitialLoading(false)
      return
    }

    const thisFetchId = ++fetchIdRef.current
    // Only clear the error on interactive loads - a background poll that
    // fails shouldn't wipe an error the user is mid-interaction with.
    if (!silent) {
      setError(null)
    }

    try {
      const accessToken = await getTasksAccessToken()
      const fetchedTasks = await fetchGoogleTasks(accessToken, selectedTaskListId, showCompleted)

      if (thisFetchId !== fetchIdRef.current) return
      const writtenAt = writeWidgetCache('google-tasks', widgetId, cacheKey, fetchedTasks)
      setTasks(fetchedTasks)
      setFetchedAt(writtenAt)
    } catch (err) {
      if (thisFetchId !== fetchIdRef.current) return
      logger.error('Error loading Google Tasks data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      if (thisFetchId === fetchIdRef.current) {
        setInitialLoading(false)
      }
    }
  }, [widgetId, cacheKey, config.googleConnected, selectedTaskListId, showCompleted])

  useEffect(() => {
    if (skipFreshMountRef.current) {
      skipFreshMountRef.current = false
      return
    }
    loadTasks()
  }, [loadTasks])

  // Background auto-refresh: polls silently on an interval while the tab is
  // visible, and refetches once when the tab becomes visible again (so the
  // list is current after the user returns from another tab/window).
  useEffect(() => {
    if (!config.googleConnected || !selectedTaskListId) return

    const intervalMs = 10 * 60 * 1000

    const handleVisibility = () => {
      if (!document.hidden) {
        loadTasks(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    const interval = setInterval(() => {
      if (!document.hidden) {
        loadTasks(true)
      }
    }, intervalMs)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [config.googleConnected, selectedTaskListId, loadTasks])

  const loadTaskLists = useCallback(async (): Promise<GoogleTaskList[]> => {
    const accessToken = await getTasksAccessToken()
    const fetchedLists = await fetchGoogleTaskLists(accessToken)
    setTaskLists(fetchedLists)
    return fetchedLists
  }, [])

  useEffect(() => {
    if (!config.googleConnected) return
    loadTaskLists().catch((err) => {
      logger.error('Error loading task lists:', err)
    })
  }, [config.googleConnected, loadTaskLists])

  useEffect(() => {
    if (!config.googleConnected) return
    return onGoogleAuthRestored(() => {
      loadTasks()
      loadTaskLists().catch((err) => logger.error('Error loading task lists:', err))
    })
  }, [config.googleConnected, loadTasks, loadTaskLists])

  const handleReconnect = async () => {
    setReconnecting(true)
    try {
      await reconnectGoogleTasks()
      invalidateWidgetCacheType('google-tasks')
    } catch (err) {
      logger.error('Error reconnecting Google Tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to reconnect Google Tasks')
    } finally {
      setReconnecting(false)
    }
  }

  const handleConnectGoogle = async () => {
    setConnecting(true)
    setError(null)

    try {
      const accessToken = await initiateGoogleTasksAuth()
      invalidateWidgetCacheType('google-tasks')
      const fetchedLists = await fetchGoogleTaskLists(accessToken)

      const primary = fetchedLists[0]
      onConfigChange?.({
        ...config,
        googleConnected: true,
        selectedTaskListId: primary?.id,
      })

      setTaskLists(fetchedLists)
    } catch (err) {
      logger.error('Error connecting to Google Tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect to Google Tasks')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnectGoogleTasks()
      invalidateWidgetCacheType('google-tasks')
      onConfigChange?.({
        ...config,
        googleConnected: false,
        selectedTaskListId: undefined,
      })
      setTasks([])
      setTaskLists([])
      setFetchedAt(null)
      setError(null)
      setNewTaskTitle('')
      setInitialLoading(true)
    } catch (err) {
      logger.error('Error disconnecting:', err)
      setError('Failed to disconnect')
    }
  }

  const handleRefresh = () => {
    setInitialLoading(true)
    loadTasks()
  }

  const handleAddTask = async () => {
    const trimmed = newTaskTitle.trim()
    if (!trimmed || !selectedTaskListId) return

    setSubmitting(true)
    setError(null)

    try {
      const accessToken = await getTasksAccessToken()
      const created = await createGoogleTask(accessToken, selectedTaskListId, trimmed)
      applyTasks((prev) => [...prev, created])
      setNewTaskTitle('')
    } catch (err) {
      logger.error('Error creating task:', err)
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleComplete = async (task: GoogleTask) => {
    if (!selectedTaskListId) return
    const isCompleted = task.status === 'completed'
    const nextStatus = isCompleted ? ('needsAction' as const) : ('completed' as const)
    const now = new Date().toISOString()
    const patch = isCompleted
      ? { status: nextStatus, completed: null }
      : { status: nextStatus, completed: now }

    // Optimistic update
    const previousTasks = tasks
    applyTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: nextStatus, completed: patch.completed } : t
      )
    )

    setActionInProgress(task.id)
    try {
      const accessToken = await getTasksAccessToken()
      await updateGoogleTask(accessToken, selectedTaskListId, task.id, patch)
    } catch (err) {
      logger.error('Error toggling task:', err)
      applyTasks(() => previousTasks)
      setError(err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedTaskListId) return
    const previousTasks = tasks
    applyTasks((prev) => prev.filter((t) => t.id !== taskId))

    setActionInProgress(taskId)
    try {
      const accessToken = await getTasksAccessToken()
      await deleteGoogleTask(accessToken, selectedTaskListId, taskId)
    } catch (err) {
      logger.error('Error deleting task:', err)
      applyTasks(() => previousTasks)
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleStartEdit = (task: GoogleTask) => {
    setEditingTaskId(task.id)
    setEditingTitle(task.title)
  }

  const handleCancelEdit = () => {
    setEditingTaskId(null)
    setEditingTitle('')
  }

  const handleSaveEdit = async (taskId: string) => {
    const trimmed = editingTitle.trim()
    if (!trimmed || !selectedTaskListId) {
      handleCancelEdit()
      return
    }

    const previousTasks = tasks
    applyTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, title: trimmed } : t))
    )
    setEditingTaskId(null)
    setEditingTitle('')

    try {
      const accessToken = await getTasksAccessToken()
      await updateGoogleTask(accessToken, selectedTaskListId, taskId, { title: trimmed })
    } catch (err) {
      logger.error('Error updating task title:', err)
      applyTasks(() => previousTasks)
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const handleTaskListChange = (listId: string) => {
    onConfigChange?.({ ...config, selectedTaskListId: listId })
    setInitialLoading(true)
  }

  const sortedTasks = [...tasks]
    .filter((t) => showCompleted || t.status !== 'completed')
    .sort((a, b) => {
      if (a.position && b.position) {
        return a.position.localeCompare(b.position)
      }
      return 0
    })

  if (!config.googleConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="status-badge status-badge-muted mb-3">
          <ListTodo className="w-5 h-5 text-secondary" strokeWidth={1.75} />
        </div>
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="text-neutral text-xs mb-3 text-center px-4">
          Connect to Google Tasks to manage your to-do list
        </p>
        <button
          onClick={handleConnectGoogle}
          disabled={connecting}
          className="btn-primary text-xs flex items-center gap-1.5"
        >
          {connecting ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Link2 className="w-3 h-3" />
              Connect Google Tasks
            </>
          )}
        </button>
        {error && (
          <p className="status-inline rounded-input px-3 py-1.5 text-[11px] mt-3 text-center max-w-[260px]">{describeAuthError(error, 'Google Tasks').title}</p>
        )}
      </div>
    )
  }

  const issue = error ? describeAuthError(error, 'Google Tasks') : null

  if (issue && tasks.length === 0 && !initialLoading) {
    return (
      <ServiceErrorState
        issue={issue}
        busy={reconnecting}
        onPrimary={issue.needsReconnect ? handleReconnect : handleRefresh}
        onDisconnect={handleDisconnect}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-2.5">
        <select
          value={selectedTaskListId ?? ''}
          onChange={(e) => handleTaskListChange(e.target.value)}
          className="w-full input-base text-xs rounded-input px-2.5 py-1.5"
        >
          {taskLists.length === 0 && <option value="">Default list</option>}
          {taskLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-1.5 mb-3">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !submitting) handleAddTask()
          }}
          placeholder="Add a task..."
          disabled={submitting}
          className="flex-1 input-base text-xs rounded-input px-2.5 py-1.5"
        />
        <button
          onClick={handleAddTask}
          disabled={!newTaskTitle.trim() || submitting}
          className="btn-primary text-xs flex items-center justify-center !px-2.5 !py-1.5 disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
        </button>
      </div>

      {initialLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-text-muted animate-spin" />
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <ListTodo className="w-6 h-6 text-text-muted mb-2 opacity-50" />
          <p className="text-text-muted text-xs">No tasks yet</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto scrollbar-thin space-y-0.5 pr-1">
          {sortedTasks.map((task) => {
            const isCompleted = task.status === 'completed'
            const isEditing = editingTaskId === task.id
            const isBusy = actionInProgress === task.id

            return (
              <li
                key={task.id}
                className="group flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover-row"
              >
                {/* Wrapper matches one text line-height so the checkbox centers
                    on the first line even when the title wraps to multiple lines. */}
                <div className="flex h-5 shrink-0 items-center">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    disabled={isBusy}
                    aria-label={isCompleted ? 'Mark as not done' : 'Mark as done'}
                    className={`w-[18px] h-[18px] rounded-md border-[1.5px] flex items-center justify-center transition-all duration-150 ${
                      isCompleted
                        ? 'bg-primary border-primary shadow-sm'
                        : 'border-text-muted hover:border-primary'
                    }`}
                    style={isCompleted ? { color: 'var(--color-on-primary)' } : undefined}
                  >
                    {isCompleted && <Check className="w-3 h-3" strokeWidth={3} />}
                  </button>
                </div>

                {isEditing ? (
                  <div className="flex-1 flex gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(task.id)
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      className="flex-1 input-base text-xs rounded-input px-1.5 py-0.5"
                    />
                    <button
                      onClick={() => handleSaveEdit(task.id)}
                      className="p-0.5 text-primary hover:text-primary/80"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-0.5 text-text-muted hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      className={`flex-1 min-w-0 text-[13px] leading-5 break-words transition-colors ${
                        isCompleted ? 'line-through text-text-muted' : 'text-text'
                      }`}
                    >
                      {task.title}
                    </span>
                    <div className="flex h-5 shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(task)}
                        disabled={isBusy}
                        className="p-0.5 text-text-muted hover:text-primary"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={isBusy}
                        className="p-0.5 text-text-muted hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {issue && tasks.length > 0 && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-input px-2.5 py-1.5 text-[11px] status-inline">
          <span className="truncate" title={issue.raw}>{issue.title}</span>
          <button
            type="button"
            onClick={issue.needsReconnect ? handleReconnect : handleRefresh}
            disabled={reconnecting}
            className="shrink-0 font-semibold hover:underline disabled:opacity-60"
          >
            {issue.needsReconnect ? 'Reconnect' : 'Retry'}
          </button>
        </div>
      )}

      <UpdatedAgo fetchedAt={fetchedAt} className="block mt-1 text-right text-[10px] text-text-muted" />
    </div>
  )
}
