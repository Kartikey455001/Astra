/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        astra: {
          bg: '#0a0d14',
          surface: '#111722',
          surfaceHover: '#161f2e',
          card: '#131b28',
          border: '#1e293b',
          borderMuted: '#15202e',
          borderHighlight: '#334155',
          textPrimary: '#f8fafc',
          textSecondary: '#94a3b8',
          textMuted: '#64748b',
          accent: '#38bdf8', // operational cyan/blue
          accentMuted: '#0369a1',
          statusOk: '#10b981', // green
          statusWarning: '#f59e0b', // amber
          statusStandby: '#eab308',
          statusInfo: '#0ea5e9',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
