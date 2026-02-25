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
  apiKey?: string
}

export interface AIChatModel {
  id: string
  name: string
}

export interface AIChatWidgetConfig {
  provider: 'openai' | 'straico'
  model: string
  openaiApiKey?: string
  straicoApiKey?: string
  straicoModels?: AIChatModel[]
  messages: ChatMessage[]
}

export interface ClockWidgetConfig {
  timezone: string
  format12Hour: boolean
  showSeconds: boolean
  fontStyle?: 'modern' | 'classic' | 'digital' | 'elegant'
  fontSize?: 'small' | 'medium' | 'large' | 'xlarge'
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
