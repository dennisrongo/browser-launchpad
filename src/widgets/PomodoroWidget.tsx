import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { PomodoroWidgetConfig } from '../types'

interface PomodoroWidgetProps {
  title: string
  config: PomodoroWidgetConfig
  onConfigChange?: (newConfig: PomodoroWidgetConfig) => void
}

type SessionType = 'focus' | 'shortBreak' | 'longBreak'

interface TimerState {
  remaining: number
  sessionType: SessionType
  completedSessions: number
  isRunning: boolean
  endTime: number | null
}

const DEFAULT_CONFIG: PomodoroWidgetConfig = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  soundEnabled: true,
}

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

export function PomodoroWidget({ config, onConfigChange }: PomodoroWidgetProps) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  const [timerState, setTimerState] = useState<TimerState>(() => ({
    remaining: getDuration('focus', mergedConfig),
    sessionType: 'focus',
    completedSessions: 0,
    isRunning: false,
    endTime: null,
  }))
  
  const [soundEnabled, setSoundEnabled] = useState(mergedConfig.soundEnabled)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const storageKey = useRef('pomodoro_timer_state')

  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2LkYuDe3Vxb3N7gIuSlI+Gfnh1dHZ8gYyUmJCHgXx3dXd9goqTl5KKgnt4d3h+g4iQk46IgXx5eHl/gYZOj42HgX16eXp+goeNjYqFfn17enp9gIaMjImEf316e3t8f4OKi4eDf3x7e3x+gIGFi4WCf3t7fH1/f4SKhYB+e3t8fX5/gYiFf3x6e3x9fn+BhoV/fHp7fH1+f4G Fg398ent8fX5/gYaFf3x6e3x9fn+BhoV/fHp7fH1+f4G='
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
  }, [])

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
          }
        }

        return { ...prev, remaining }
      })
    }, 100)

    return () => clearInterval(interval)
  }, [timerState.isRunning, soundEnabled, mergedConfig])

  const toggleTimer = useCallback(() => {
    setTimerState((prev) => {
      if (prev.isRunning) {
        return { ...prev, isRunning: false, endTime: null }
      }
      return {
        ...prev,
        isRunning: true,
        endTime: Date.now() + prev.remaining,
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
    }))
  }, [mergedConfig])

  const skipSession = useCallback(() => {
    setTimerState((prev) => {
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
      }
    })
  }, [mergedConfig])

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

  return (
    <div className="flex flex-col items-center justify-center h-full py-2">
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
          <span className="text-2xl font-bold text-primary tabular-nums tracking-tight">
            {formatTime(timerState.remaining)}
          </span>
          <span className="text-xs text-text-secondary mt-0.5">
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
                ? 'bg-primary' 
                : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTimer}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 bg-primary/10 hover:bg-primary/20 text-primary"
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
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-surface text-text-secondary hover:text-text"
          title="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        
        <button
          onClick={skipSession}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-surface text-text-secondary hover:text-text"
          title="Skip"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        
        <button
          onClick={toggleSound}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-surface text-text-secondary hover:text-text"
          title={soundEnabled ? 'Mute' : 'Unmute'}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="text-xs text-text-muted mt-2">
        {timerState.completedSessions} session{timerState.completedSessions !== 1 ? 's' : ''} completed
      </div>
    </div>
  )
}
