/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#818CF8',
          DEFAULT: 'var(--color-primary)',
          dark: '#6366F1',
        },
        accent: {
          light: '#FBBF24',
          DEFAULT: 'var(--color-accent)',
          dark: '#F59E0B',
        },
        background: {
          light: '#F8FAFC',
          DEFAULT: 'var(--color-background)',
          dark: '#F1F5F9',
        },
        surface: {
          light: 'var(--color-surface)',
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
        },
        text: {
          light: '#1E293B',
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          muted: '#94A3B8',
        },
        border: {
          light: '#E2E8F0',
          DEFAULT: 'var(--color-border)',
          dark: '#CBD5E1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      spacing: {
        'base': '4px',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '8px',
        'lg': '16px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        'glass': '0 4px 16px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'glass-hover': '0 8px 24px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        'glow-primary': '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-accent': '0 0 20px rgba(245, 158, 11, 0.15)',
        'modal': '0 24px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08)',
      },
      backdropBlur: {
        'glass': '16px',
        'modal': '24px',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
        'gradient-surface': 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-background) 100%)',
        'gradient-accent': 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light, #FBBF24) 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 8px rgba(99, 102, 241, 0.1)' },
          '100%': { boxShadow: '0 0 16px rgba(99, 102, 241, 0.2)' },
        },
      },
      transitionTimingFunction: {
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
