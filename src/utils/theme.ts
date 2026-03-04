export type ThemeName =
  | 'modern-light'
  | 'dark-elegance'
  | 'vintage-rose'
  | 'sage-sanctuary'
  | 'midnight-charcoal'
  | 'lavender-dreams'
  | 'caramel-comfort'
  | 'arctic-frost'
  | 'crimson-night'
  | 'plum-blossom'
  | 'sage-meadow'

const allThemes: ThemeName[] = [
  'modern-light',
  'dark-elegance',
  'vintage-rose',
  'sage-sanctuary',
  'midnight-charcoal',
  'lavender-dreams',
  'caramel-comfort',
  'arctic-frost',
  'crimson-night',
  'plum-blossom',
  'sage-meadow',
]

export function applyTheme(theme: ThemeName): void {
  document.documentElement.classList.remove('dark')
  allThemes.forEach(() => document.documentElement.removeAttribute(`data-theme`))

  if (theme === 'dark-elegance' || theme === 'plum-blossom') {
    document.documentElement.classList.add('dark')
  }
  if (theme !== 'modern-light' && theme !== 'dark-elegance') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

export function getAppliedTheme(): ThemeName {
  const dataTheme = document.documentElement.getAttribute('data-theme') as ThemeName | null
  if (dataTheme) {
    return dataTheme
  }
  if (document.documentElement.classList.contains('dark')) {
    return 'dark-elegance'
  }
  return 'modern-light'
}
