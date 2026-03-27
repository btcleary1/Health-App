import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#050814',
        card: '#0B1120',
        border: '#111827',
        'text-primary': '#F9FAFB',
        'text-secondary': '#9CA3AF',
        positive: '#22C55E',
        negative: '#EF4444',
        warning: '#F97316',
        accent: '#3B82F6',
      },
    },
  },
  plugins: [],
}
export default config
