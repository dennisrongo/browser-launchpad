import { AIChatWidgetConfig } from '../types'

interface AIChatWidgetProps {
  title: string
  config: AIChatWidgetConfig
}

export function AIChatWidget({ title, config }: AIChatWidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-4xl mb-2">🤖</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-text-secondary text-sm">{config.provider || 'No provider'} - {config.model || 'No model'}</p>
    </div>
  )
}
