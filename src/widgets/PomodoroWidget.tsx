import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, Clock, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns'
import { PomodoroWidgetConfig, PomodoroSession, PomodoroDayHistory } from '../types'
import { pomodoroHistoryStorage } from '../services/storage'

interface PomodoroWidgetProps {
  title: string
  config: PomodoroWidgetConfig
  onConfigChange?: (newConfig: PomodoroWidgetConfig) => void
  widgetId?: string
}

type SessionType = 'focus' | 'shortBreak' | 'longBreak'
type ViewMode = 'timer' | 'history'

interface TimerState {
  remaining: number
  sessionType: SessionType
  completedSessions: number
  isRunning: boolean
  endTime: number | null
  sessionStartTime: number | null
}

const DEFAULT_CONFIG: PomodoroWidgetConfig = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  soundEnabled: true,
}

const HISTORY_RETENTION_DAYS = 30

const getDuration = (sessionType: SessionType, config: PomodoroWidgetConfig): number => {
  const durations = {
    focus: config.focusDuration || DEFAULT_CONFIG.focusDuration,
    shortBreak: config.shortBreakDuration || DEFAULT_CONFIG.shortBreakDuration,
    longBreak: config.longBreakDuration || DEFAULT_CONFIG.longBreakDuration,
  }
  return durations[sessionType] * 60 * 1000
}

const getNextSessionType = (current: SessionType, completedSessions: number, config: PomodoroWidgetConfig): SessionType => {
  if (current === 'focus') {
    const sessionsUntilLong = config.sessionsUntilLongBreak || DEFAULT_CONFIG.sessionsUntilLongBreak
    return completedSessions % sessionsUntilLong === 0 ? 'longBreak' : 'shortBreak'
  }
  return 'focus'
}

const formatDateKey = (date: Date): string => format(date, 'yyyy-MM-dd')

export function PomodoroWidget({ config, onConfigChange, widgetId = 'default' }: PomodoroWidgetProps) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  const [timerState, setTimerState] = useState<TimerState>(() => ({
    remaining: getDuration('focus', mergedConfig),
    sessionType: 'focus',
    completedSessions: 0,
    isRunning: false,
    endTime: null,
    sessionStartTime: null,
  }))
  
  const [soundEnabled, setSoundEnabled] = useState(mergedConfig.soundEnabled)
  const [viewMode, setViewMode] = useState<ViewMode>('timer')
  const [history, setHistory] = useState<PomodoroDayHistory[]>([])
  const [historyMonth, setHistoryMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const storageKey = useRef('pomodoro_timer_state')
  const sessionStartRef = useRef<number | null>(null)

  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2LkYuDe3Vxb3N7gIuSlI+Gfnh1dHZ8gYyUmJCHgXx3dXd9goqTl5KKgnt4d3h+g4iQk46IgXx5eHl/gYZOj42HgX16eXp+goeNjYqFfn17enp9f4OKi4eDf3x7e3x+gIGFi4WCf3t7fH1/f4SKhYB+e3t8fX5/gYiFf3x6e3x9fn+BhoV/fHp7fH1+f4G='
    audioRef.current.volume = 0.5

    const loadState = async () => {
      try {
        const result = await chrome.storage.local.get(storageKey.current)
        if (result[storageKey.current]) {
          const saved = result[storageKey.current] as TimerState
          if (saved.isRunning && saved.endTime) {
            const now = Date.now()
            const remaining = saved.endTime - now
            if (remaining > 0) {
              setTimerState({ ...saved, remaining })
              sessionStartRef.current = saved.sessionStartTime
            } else {
              setTimerState({ ...saved, remaining: 0, isRunning: false })
            }
          } else {
            setTimerState(saved)
          }
        }
      } catch (e) {
        console.error('Failed to load pomodoro state:', e)
      }
    }
    loadState()
    loadHistory()
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const result = await pomodoroHistoryStorage.get(widgetId)
      if (result.data) {
        const cleaned = cleanupOldHistory(result.data)
        setHistory(cleaned)
        if (JSON.stringify(cleaned) !== JSON.stringify(result.data)) {
          await pomodoroHistoryStorage.set(widgetId, cleaned)
        }
      }
    } catch (e) {
      console.error('Failed to load pomodoro history:', e)
    }
  }, [widgetId])

  const cleanupOldHistory = (history: PomodoroDayHistory[]): PomodoroDayHistory[] => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - HISTORY_RETENTION_DAYS)
    const cutoffKey = formatDateKey(cutoff)
    return history.filter(day => day.date >= cutoffKey)
  }

  const recordSession = useCallback(async (
    type: SessionType,
    wasCompleted: boolean,
    startTime: number,
    plannedDuration: number
  ) => {
    const endTime = Date.now()
    const actualDuration = endTime - startTime
    
    const session: PomodoroSession = {
      id: `${endTime}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date(endTime).toISOString(),
      duration: actualDuration,
      plannedDuration,
      wasCompleted,
    }

    const dateKey = formatDateKey(new Date(startTime))
    
    try {
      const result = await pomodoroHistoryStorage.get(widgetId)
      let currentHistory: PomodoroDayHistory[] = result.data || []
      currentHistory = cleanupOldHistory(currentHistory)
      
      const dayIndex = currentHistory.findIndex(d => d.date === dateKey)
      if (dayIndex >= 0) {
        currentHistory[dayIndex].sessions.push(session)
      } else {
        currentHistory.push({ date: dateKey, sessions: [session] })
      }
      
      currentHistory.sort((a, b) => b.date.localeCompare(a.date))
      
      await pomodoroHistoryStorage.set(widgetId, currentHistory)
      setHistory(currentHistory)
    } catch (e) {
      console.error('Failed to record session:', e)
    }
  }, [widgetId])

  useEffect(() => {
    const saveState = async () => {
      try {
        await chrome.storage.local.set({ [storageKey.current]: timerState })
      } catch (e) {
        console.error('Failed to save pomodoro state:', e)
      }
    }
    saveState()
  }, [timerState])

  useEffect(() => {
    if (!timerState.isRunning) return

    const interval = setInterval(() => {
      setTimerState((prev) => {
        if (!prev.isRunning || !prev.endTime) return prev

        const now = Date.now()
        const remaining = prev.endTime - now

        if (remaining <= 0) {
          if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {})
          }
          
          if (prev.sessionStartTime) {
            recordSession(
              prev.sessionType,
              true,
              prev.sessionStartTime,
              getDuration(prev.sessionType, mergedConfig)
            )
          }
          
          const completedSessions = prev.sessionType === 'focus' 
            ? prev.completedSessions + 1 
            : prev.completedSessions
          
          const nextType = getNextSessionType(prev.sessionType, completedSessions, mergedConfig)
          const nextDuration = getDuration(nextType, mergedConfig)
          
          return {
            remaining: nextDuration,
            sessionType: nextType,
            completedSessions,
            isRunning: mergedConfig.autoStartBreaks,
            endTime: mergedConfig.autoStartBreaks ? Date.now() + nextDuration : null,
            sessionStartTime: mergedConfig.autoStartBreaks ? Date.now() : null,
          }
        }

        return { ...prev, remaining }
      })
    }, 100)

    return () => clearInterval(interval)
  }, [timerState.isRunning, soundEnabled, mergedConfig, recordSession])

  const toggleTimer = useCallback(() => {
    setTimerState((prev) => {
      if (prev.isRunning) {
        return { ...prev, isRunning: false, endTime: null }
      }
      const now = Date.now()
      sessionStartRef.current = now
      return {
        ...prev,
        isRunning: true,
        endTime: now + prev.remaining,
        sessionStartTime: sessionStartRef.current,
      }
    })
  }, [])

  const resetTimer = useCallback(() => {
    setTimerState((prev) => ({
      remaining: getDuration(prev.sessionType, mergedConfig),
      sessionType: prev.sessionType,
      completedSessions: prev.completedSessions,
      isRunning: false,
      endTime: null,
      sessionStartTime: null,
    }))
    sessionStartRef.current = null
  }, [mergedConfig])

  const skipSession = useCallback(() => {
    setTimerState((prev) => {
      if (prev.sessionStartTime && prev.isRunning) {
        recordSession(
          prev.sessionType,
          false,
          prev.sessionStartTime,
          getDuration(prev.sessionType, mergedConfig)
        )
      }
      
      const completedSessions = prev.sessionType === 'focus' 
        ? prev.completedSessions + 1 
        : prev.completedSessions
      const nextType = getNextSessionType(prev.sessionType, completedSessions, mergedConfig)
      const nextDuration = getDuration(nextType, mergedConfig)
      
      return {
        remaining: nextDuration,
        sessionType: nextType,
        completedSessions,
        isRunning: false,
        endTime: null,
        sessionStartTime: null,
      }
    })
    sessionStartRef.current = null
  }, [mergedConfig, recordSession])

  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    onConfigChange?.({ ...mergedConfig, soundEnabled: newValue })
  }

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const formatDuration = (ms: number): string => {
    const totalMinutes = Math.round(ms / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getSessionLabel = (type: SessionType): string => {
    switch (type) {
      case 'focus': return 'Focus'
      case 'shortBreak': return 'Short Break'
      case 'longBreak': return 'Long Break'
    }
  }

  const totalDuration = getDuration(timerState.sessionType, mergedConfig)
  const progress = timerState.remaining / totalDuration
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference * (1 - progress)

  const sessionsUntilLong = mergedConfig.sessionsUntilLongBreak || DEFAULT_CONFIG.sessionsUntilLongBreak
  const currentCyclePosition = (timerState.completedSessions % sessionsUntilLong) + (timerState.sessionType === 'focus' ? 0 : 1)

  const getDayHistory = (date: Date): PomodoroDayHistory | undefined => {
    const dateKey = formatDateKey(date)
    return history.find(h => h.date === dateKey)
  }

  const getSessionCount = (dayHistory: PomodoroDayHistory | undefined): number => {
    if (!dayHistory) return 0
    return dayHistory.sessions.filter(s => s.type === 'focus' && s.wasCompleted).length
  }

  const calculateDayStats = (dayHistory: PomodoroDayHistory | undefined) => {
    if (!dayHistory) return { totalFocusTime: 0, completedSessions: 0, avgSessionLength: 0 }
    
    const focusSessions = dayHistory.sessions.filter(s => s.type === 'focus' && s.wasCompleted)
    const totalFocusTime = focusSessions.reduce((sum, s) => sum + s.duration, 0)
    const completedSessions = focusSessions.length
    const avgSessionLength = completedSessions > 0 ? totalFocusTime / completedSessions : 0
    
    return { totalFocusTime, completedSessions, avgSessionLength }
  }

  const renderHistoryCalendar = () => {
    const monthStart = startOfMonth(historyMonth)
    const monthEnd = endOfMonth(historyMonth)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const startDay = monthStart.getDay()
    
    const weeks: Date[][] = []
    let currentWeek: Date[] = []
    
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null as unknown as Date)
    }
    
    days.forEach(day => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    })
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setHistoryMonth(subMonths(historyMonth, 1))}
            className="p-1 hover:bg-surface rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">{format(historyMonth, 'MMMM yyyy')}</span>
          <button
            onClick={() => setHistoryMonth(addMonths(historyMonth, 1))}
            className="p-1 hover:bg-surface rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-[10px] text-text-muted text-center py-0.5 font-medium">
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1 space-y-0.5">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-0.5">
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <div key={dayIndex} className="h-7" />
                }
                
                const dayHistory = getDayHistory(day)
                const sessionCount = getSessionCount(dayHistory)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, historyMonth)
                const isTodayDate = isToday(day)
                
                let dotSize = ''
                if (sessionCount >= 5) dotSize = 'w-2.5 h-2.5 bg-primary'
                else if (sessionCount >= 3) dotSize = 'w-2 h-2 bg-primary/80'
                else if (sessionCount >= 1) dotSize = 'w-1.5 h-1.5 bg-primary/60'
                
                return (
                  <button
                    key={dayIndex}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`
                      h-7 flex flex-col items-center justify-center rounded text-[11px] transition-colors
                      ${isSelected ? 'bg-primary/30 ring-1 ring-primary' : ''}
                      ${!isCurrentMonth ? 'opacity-40' : ''}
                      ${isTodayDate && !isSelected ? 'bg-primary/10' : ''}
                      hover:bg-surface
                    `}
                  >
                    <span className={isTodayDate ? 'text-primary font-medium' : ''}>
                      {format(day, 'd')}
                    </span>
                    {sessionCount > 0 && (
                      <div className={`${dotSize} rounded-full mt-0.5`} />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {selectedDate && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="text-xs font-medium mb-1">{format(selectedDate, 'MMMM d, yyyy')}</div>
            {(() => {
              const dayHistory = getDayHistory(selectedDate)
              const stats = calculateDayStats(dayHistory)
              
              if (stats.completedSessions === 0) {
                return <div className="text-xs text-text-muted">No focus sessions recorded</div>
              }
              
              return (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-primary">{formatDuration(stats.totalFocusTime)}</div>
                      <div className="text-[10px] text-text-muted">Focus Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-primary">{stats.completedSessions}</div>
                      <div className="text-[10px] text-text-muted">Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-primary">{formatDuration(stats.avgSessionLength)}</div>
                      <div className="text-[10px] text-text-muted">Avg Length</div>
                    </div>
                  </div>
                  
                  <div className="max-h-20 overflow-y-auto space-y-0.5">
                    {dayHistory?.sessions.filter(s => s.type === 'focus').map(session => (
                      <div
                        key={session.id}
                        className="flex items-center gap-1.5 text-[10px] py-0.5 px-1 rounded bg-surface/50"
                      >
                        <span className={session.wasCompleted ? 'text-primary' : 'text-text-muted'}>
                          {session.wasCompleted ? '✓' : '○'}
                        </span>
                        <span className="text-text-muted">
                          {format(parseISO(session.startedAt), 'h:mm a')}
                        </span>
                        <span className="text-text-muted">-</span>
                        <span className="text-text-muted">
                          {format(parseISO(session.completedAt), 'h:mm a')}
                        </span>
                        <span className="ml-auto">{formatDuration(session.duration)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center gap-1 mb-2">
        <button
          onClick={() => setViewMode('timer')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            viewMode === 'timer' 
              ? 'bg-primary/20 text-primary' 
              : 'text-text-muted hover:text-text hover:bg-surface'
          }`}
        >
          <Clock className="w-3 h-3" />
          Timer
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            viewMode === 'history' 
              ? 'bg-primary/20 text-primary' 
              : 'text-text-muted hover:text-text hover:bg-surface'
          }`}
        >
          <BarChart3 className="w-3 h-3" />
          History
        </button>
      </div>

      {viewMode === 'timer' ? (
        <div className="flex flex-col items-center justify-center flex-1 py-2">
          <div className="relative w-36 h-36 mb-3">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="6"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="url(#pomodoro-gradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-200"
              />
              <defs>
                <linearGradient id="pomodoro-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-primary)" />
                  <stop offset="100%" stopColor="var(--color-primary-light)" />
                </linearGradient>
              </defs>
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gradient-accent tabular-nums tracking-tight">
                {formatTime(timerState.remaining)}
              </span>
              <span className="text-xs text-neutral mt-0.5">
                {getSessionLabel(timerState.sessionType)}
              </span>
            </div>
            
            {timerState.isRunning && (
              <div 
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
                  animation: 'pomodoroGlow 2s ease-in-out infinite',
                }}
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-3">
            {Array.from({ length: sessionsUntilLong }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < currentCyclePosition 
                    ? 'bg-accent' 
                    : 'bg-border'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTimer}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 bg-secondary/10 hover:bg-secondary/20 text-secondary"
              title={timerState.isRunning ? 'Pause' : 'Start'}
            >
              {timerState.isRunning ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>
            
            <button
              onClick={resetTimer}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-surface text-neutral hover:text-text"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            <button
              onClick={skipSession}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-surface text-neutral hover:text-text"
              title="Skip"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            
            <button
              onClick={toggleSound}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-surface text-neutral hover:text-text"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="text-xs text-neutral mt-2">
            {timerState.completedSessions} session{timerState.completedSessions !== 1 ? 's' : ''} completed
          </div>
        </div>
      ) : (
        <div className="flex-1 px-1">
          {renderHistoryCalendar()}
        </div>
      )}
    </div>
  )
}
