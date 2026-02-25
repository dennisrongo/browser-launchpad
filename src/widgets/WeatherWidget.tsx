import { WeatherWidgetConfig } from '../types'

interface WeatherWidgetProps {
  title: string
  config: WeatherWidgetConfig
}

export function WeatherWidget({ title, config }: WeatherWidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-4xl mb-2">🌤️</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-text-secondary text-sm">{config.city || 'No city configured'}</p>
    </div>
  )
}
