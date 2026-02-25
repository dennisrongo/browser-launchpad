import { BookmarkWidgetConfig } from '../types'

interface BookmarkWidgetProps {
  title: string
  config: BookmarkWidgetConfig
}

export function BookmarkWidget({ title, config }: BookmarkWidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-4xl mb-2">🔖</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-text-secondary text-sm text-center">
        {config.bookmarks?.length || 0} bookmark{config.bookmarks?.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
