import type { ThemeName } from '../utils/theme'

export interface Page {
  id: string
  name: string
  order: number
  widgets: Widget[]
  created_at: string
  updated_at: string
}

export type WidgetType = 'bookmark' | 'weather' | 'ai-chat' | 'clock' | 'todo' | 'pomodoro' | 'calendar' | 'notes' | 'x-timeline' | 'kanban'

export interface Widget {
  id: string
  type: WidgetType
  page_id: string
  column: number
  order: number
  title: string
  config: WidgetConfig
  colSpan?: number
  created_at: string
}

export type WidgetConfig =
  | BookmarkWidgetConfig
  | WeatherWidgetConfig
  | AIChatWidgetConfig
  | ClockWidgetConfig
  | TodoWidgetConfig
  | PomodoroWidgetConfig
  | CalendarWidgetConfig
  | NotesWidgetConfig
  | XTimelineWidgetConfig
  | KanbanWidgetConfig

export interface BookmarkWidgetConfig {
  bookmarks: Bookmark[]
}

export interface Bookmark {
  id: string
  url: string
  title: string
  icon?: string // emoji or data URL
}

export interface WeatherWidgetConfig {
  city: string
  units: 'celsius' | 'fahrenheit'
  apiKey?: string
}

export interface AIChatWidgetConfig {
  messages: ChatMessage[]
  provider?: 'openai' | 'straico'
  openaiApiKey?: string
  straicoApiKey?: string
  model?: string
}

export interface ClockWidgetConfig {
  timezone: string
  format12Hour: boolean
  showSeconds: boolean
  fontStyle?: 'modern' | 'classic' | 'digital' | 'elegant'
  fontSize?: 'small' | 'medium' | 'large' | 'xlarge'
}

export interface TodoTag {
  id: string
  name: string
  color: string
}

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  tagIds: string[]
  dueDate?: string
  archived: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export interface TodoWidgetConfig {
  items: TodoItem[]
  tags: TodoTag[]
  sortBy: 'manual' | 'priority' | 'dueDate'
  filter: 'all' | 'active' | 'completed' | 'archived'
}

export interface PomodoroWidgetConfig {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  soundEnabled: boolean
}

export interface CalendarWidgetConfig {
  viewMode: 'month' | 'week'
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6
  showWeekNumbers: boolean
  googleConnected: boolean
  googleTokens?: {
    access_token: string
    refresh_token?: string
    expires_at: number
  }
  selectedCalendars?: string[]
}

export interface NotesWidgetConfig {
  content: string
}

export interface XTimelineWidgetConfig {
  refreshMinutes: number
  timelineType: 'foryou' | 'following'
  tweetsPerPage: number
  scrollIntervalSeconds: number
}

export interface KanbanCard {
  id: string
  title: string
  description?: string
  columnId: string
  order: number
  createdAt?: string
  updatedAt?: string
}

export interface KanbanColumn {
  id: string
  title: string
  order: number
}

export interface KanbanWidgetConfig {
  columns: KanbanColumn[]
  cards: KanbanCard[]
}

export interface XTweet {
  id: string
  authorName: string
  authorHandle: string
  authorProfileImage?: string
  text: string
  createdAt: string
  url: string
  quotedTweet?: XTweet
  replyTo?: XTweet
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  colorId?: string
  calendarId?: string
}

export interface GoogleCalendar {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
}

export interface Settings {
  id: string
  theme: ThemeName
  grid_columns: number
  grid_gap: number
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface PomodoroSession {
  id: string
  type: 'focus' | 'shortBreak' | 'longBreak'
  startedAt: string
  completedAt: string
  duration: number
  plannedDuration: number
  wasCompleted: boolean
}

export interface PomodoroDayHistory {
  date: string
  sessions: PomodoroSession[]
}
