export type ThemeName =
  | 'modern-light'
  | 'dark-elegance'
  | 'vintage-rose'
  | 'sage-sanctuary'
  | 'midnight-charcoal'
  | 'lavender-dreams'
  | 'caramel-comfort'
  | 'arctic-frost'

const allThemes: ThemeName[] = [
  'modern-light',
  'dark-elegance',
  'vintage-rose',
  'sage-sanctuary',
  'midnight-charcoal',
  'lavender-dreams',
  'caramel-comfort',
  'arctic-frost',
]

export function applyTheme(theme: ThemeName): void {
  document.documentElement.classList.remove('dark')
  allThemes.forEach(() => document.documentElement.removeAttribute(`data-theme`))

  if (theme === 'dark-elegance') {
    document.documentElement.classList.add('dark')
  } else if (theme !== 'modern-light') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

export function getAppliedTheme(): ThemeName {
  if (document.documentElement.classList.contains('dark')) {
    return 'dark-elegance'
  }
  const dataTheme = document.documentElement.getAttribute('data-theme') as ThemeName | null
  return dataTheme || 'modern-light'
}
