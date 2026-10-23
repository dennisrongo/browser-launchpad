import type { Page, Widget, WidgetConfig, WidgetType } from '../src/types'

const NOW = '2026-01-15T12:00:00.000Z'

export function makeWidget(
  type: WidgetType,
  config: WidgetConfig,
  overrides: Partial<Widget> = {}
): Widget {
  const id = overrides.id ?? `${type}-widget`
  return {
    id,
    type,
    page_id: 'page-1',
    column: 0,
    order: 0,
    title: overrides.title ?? `${type} widget`,
    config,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
}

export function makePage(widgets: Widget[], overrides: Partial<Page> = {}): Page {
  return {
    id: 'page-1',
    name: 'Home',
    order: 0,
    widgets: widgets.map((widget, index) => ({ ...widget, order: index })),
    created_at: NOW,
    updated_at: NOW,
    layout_updated_at: NOW,
    ...overrides,
  }
}

export function notesStorageKey(widgetId: string): string {
  return `notes-notes-${widgetId}`
}
