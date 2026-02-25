export interface Page {
  id: string
  name: string
  order: number
  widgets: Widget[]
  created_at: string
  updated_at: string
}

export type WidgetType = 'bookmark' | 'weather' | 'ai-chat' | 'clock'

export interface Widget {
  id: string
  type: WidgetType
  page_id: string
  order: number
  title: string
  config: WidgetConfig
  created_at: string
}

export type WidgetConfig =
  | BookmarkWidgetConfig
  | WeatherWidgetConfig
  | AIChatWidgetConfig
  | ClockWidgetConfig

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
}

export interface AIChatWidgetConfig {
  provider: 'openai' | 'straico'
  model: string
}

export interface ClockWidgetConfig {
  timezone: string
  format12Hour: boolean
  showSeconds: boolean
}

export interface Settings {
  id: string
  theme: 'modern-light' | 'dark-elegance'
  grid_columns: number
  grid_gap: number
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
