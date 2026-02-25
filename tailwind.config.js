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
        // Modern Light Theme
        primary: {
          light: '#3B82F6',
          DEFAULT: '#3B82F6',
        },
        background: {
          light: '#FFFFFF',
          DEFAULT: '#FFFFFF',
        },
        surface: {
          light: '#F3F4F6',
          DEFAULT: '#F3F4F6',
        },
        text: {
          light: '#1F2937',
          DEFAULT: '#1F2937',
          secondary: {
            light: '#6B7280',
            DEFAULT: '#6B7280',
          }
        },
        border: {
          light: '#E5E7EB',
          DEFAULT: '#E5E7EB',
        },
        // Dark Elegance Theme
        dark: {
          primary: '#8B5CF6',
          background: '#111827',
          surface: '#1F2937',
          text: '#F9FAFB',
          'text-secondary': '#9CA3AF',
          border: '#374151',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      spacing: {
        'base': '4px',
      },
      borderRadius: {
        'card': '8px',
        'button': '6px',
        'input': '6px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
