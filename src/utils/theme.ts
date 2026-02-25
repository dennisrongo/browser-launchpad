export type ThemeName = 'modern-light' | 'dark-elegance'

export function applyTheme(theme: ThemeName): void {
  console.log('applyTheme called with:', theme)
  if (theme === 'dark-elegance') {
    document.documentElement.classList.add('dark')
    console.log('Added dark class, classes:', document.documentElement.classList.toString())
  } else {
    document.documentElement.classList.remove('dark')
    console.log('Removed dark class, classes:', document.documentElement.classList.toString())
  }
}

export function getAppliedTheme(): ThemeName {
  return document.documentElement.classList.contains('dark') ? 'dark-elegance' : 'modern-light'
}
