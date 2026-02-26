export type ThemeName = 'modern-light' | 'dark-elegance'

export function applyTheme(theme: ThemeName): void {
  if (theme === 'dark-elegance') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function getAppliedTheme(): ThemeName {
  return document.documentElement.classList.contains('dark') ? 'dark-elegance' : 'modern-light'
}
