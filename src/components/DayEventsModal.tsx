import { X, CalendarClock } from 'lucide-react'
import { format } from 'date-fns'
import type { CalendarEvent } from '../types'
import { getEventColor, formatEventTime } from '../utils/calendar'

interface DayEventsModalProps {
  date: Date
  events: CalendarEvent[]
  onClose: () => void
}

export function DayEventsModal({ date, events, onClose }: DayEventsModalProps) {
  const sortedEvents = [...events].sort((a, b) => {
    if (a.allDay && !b.allDay) return -1
    if (!a.allDay && b.allDay) return 1
    return a.start.localeCompare(b.start)
  })

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass-modal rounded-lg p-4 sm:p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gradient">{format(date, 'EEEE, MMMM d, yyyy')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text hover:bg-surface rounded-button transition-all duration-200"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sortedEvents.length === 0 ? (
          <p className="text-text-muted text-center py-8">No events scheduled for this day</p>
        ) : (
          <div className="space-y-2 mb-6">
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 glass-card rounded-card hover:bg-surface/50 transition-colors duration-200"
                style={{ borderLeft: `3px solid ${getEventColor(event.colorId)}` }}
              >
                <div className="min-w-0">
                  <p className="font-medium text-text truncate">{event.title}</p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {formatEventTime(event.start, event.end, event.allDay)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
