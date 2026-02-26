import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay as dateFnsIsSameDay,
  isToday as dateFnsIsToday,
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfDay,
  endOfDay,
  parseISO,
  isWithinInterval,
  getWeek,
} from 'date-fns'
import type { CalendarEvent } from '../types'

export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
}

export function getMonthGrid(
  currentDate: Date,
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  events: CalendarEvent[] = []
): CalendarDay[][] {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: firstDayOfWeek })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: firstDayOfWeek })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const calendarDays: CalendarDay[] = days.map((day) => ({
    date: day,
    isCurrentMonth: isSameMonth(day, currentDate),
    isToday: dateFnsIsToday(day),
    events: getEventsForDay(events, day),
  }))

  const weeks: CalendarDay[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  return weeks
}

export function getWeekGrid(
  currentDate: Date,
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  events: CalendarEvent[] = []
): CalendarDay[] {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: firstDayOfWeek })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: firstDayOfWeek })

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  return days.map((day) => ({
    date: day,
    isCurrentMonth: true,
    isToday: dateFnsIsToday(day),
    events: getEventsForDay(events, day),
  }))
}

export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)

  return events.filter((event) => {
    const eventStart = parseISO(event.start)
    const eventEnd = parseISO(event.end)

    if (event.allDay) {
      return isSameDay(eventStart, day)
    }

    return (
      isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
      isWithinInterval(dayEnd, { start: eventStart, end: eventEnd }) ||
      isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) ||
      isWithinInterval(eventEnd, { start: dayStart, end: dayEnd })
    )
  })
}

export function isToday(date: Date): boolean {
  return dateFnsIsToday(date)
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateFnsIsSameDay(a, b)
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy')
}

export function formatWeekRange(date: Date, firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6): string {
  const weekStart = startOfWeek(date, { weekStartsOn: firstDayOfWeek })
  const weekEnd = endOfWeek(date, { weekStartsOn: firstDayOfWeek })
  return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
}

export function formatEventTime(start: string, end: string, allDay: boolean): string {
  if (allDay) return 'All day'

  const startDate = parseISO(start)
  const endDate = parseISO(end)

  if (isSameDay(startDate, endDate)) {
    return `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`
  }

  return `${format(startDate, 'MMM d, h:mm a')} - ${format(endDate, 'MMM d, h:mm a')}`
}

export function getWeekNumber(date: Date): number {
  return getWeek(date, { weekStartsOn: 1 })
}

export function navigateMonth(currentDate: Date, direction: 'prev' | 'next'): Date {
  return direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1)
}

export function navigateWeek(currentDate: Date, direction: 'prev' | 'next'): Date {
  return direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1)
}

export function goToToday(): Date {
  return new Date()
}

export function getDayAbbreviations(firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6): string[] {
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const rotated = [...days.slice(firstDayOfWeek), ...days.slice(0, firstDayOfWeek)]
  return rotated
}

export function getHoursForWeekView(): number[] {
  return Array.from({ length: 24 }, (_, i) => i)
}

export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

export function getEventColor(colorId?: string): string {
  const colors: Record<string, string> = {
    '1': '#7986cb',
    '2': '#33b679',
    '3': '#8e24aa',
    '4': '#e67c73',
    '5': '#f6c026',
    '6': '#f5511d',
    '7': '#039be5',
    '8': '#616161',
    '9': '#3f51b5',
    '10': '#0b8043',
    '11': '#d60000',
  }
  return colorId ? colors[colorId] || '#4285f4' : '#4285f4'
}
