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
          light: 'var(--color-primary-light)',
          DEFAULT: 'var(--color-primary)',
        },
        secondary: {
          light: 'var(--color-secondary-light)',
          DEFAULT: 'var(--color-secondary)',
        },
        accent: {
          light: 'var(--color-accent-light)',
          DEFAULT: 'var(--color-accent)',
        },
        neutral: {
          light: 'var(--color-neutral-light)',
          DEFAULT: 'var(--color-neutral)',
        },
        background: {
          DEFAULT: 'var(--color-background)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
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
        'card': '16px',
        'button': '10px',
        'input': '10px',
        'lg': '20px',
        'xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-hover': '0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)',
        'glass': '0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.1)',
        'glass-hover': '0 4px 12px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.15)',
        'glow-primary': '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-accent': '0 0 20px rgba(245, 158, 11, 0.15)',
        'modal': '0 8px 16px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.12), 0 32px 64px rgba(0,0,0,0.08)',
        'dropdown': '0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.06)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.12)',
        'focus-ring': '0 0 0 3px rgba(99, 102, 241, 0.15)',
      },
      backdropBlur: {
        'glass': '16px',
        'modal': '24px',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
        'gradient-secondary': 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-light) 100%)',
        'gradient-accent': 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
        'gradient-surface': 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-background) 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'dropdown-in': 'dropdownIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
        'modal-in': 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-fast': 'fadeIn 0.1s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 8px rgba(99, 102, 241, 0.1)' },
          '100%': { boxShadow: '0 0 16px rgba(99, 102, 241, 0.2)' },
        },
        dropdownIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      transitionTimingFunction: {
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'snap': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
