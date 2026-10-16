/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // "The Ledger": warm paper, ink, hairline rules, one vermilion accent.
      colors: {
        paper: { DEFAULT: '#F7F5F0', raised: '#FCFBF8', sunk: '#EFECE4' },
        ink: { DEFAULT: '#1B1A17', soft: '#45423B', muted: '#6B675D', faint: '#A39E92' },
        line: { DEFAULT: '#E4E0D6', strong: '#CFC9BB' },
        accent: { DEFAULT: '#C2410C', hover: '#A3360A', soft: '#FBEDE5' },
        danger: { DEFAULT: '#B42318', hover: '#912018', soft: '#FCEDEB' },
        success: { DEFAULT: '#00785C', soft: '#E6F2EE' },
        // Application statuses. Validated as a categorical set on the paper surface (CVD ΔE >= 8).
        status: { applied: '#3B6EA8', interview: '#B57A0A', offer: '#00785C', rejected: '#B0619B' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-in': { from: { transform: 'translateX(24px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        'drawer-in': { from: { transform: 'translateX(-24px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        'pop-in': { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'sheet-in': 'sheet-in 180ms ease-out',
        'drawer-in': 'drawer-in 180ms ease-out',
        'pop-in': 'pop-in 160ms ease-out',
      },
    },
  },
  plugins: [],
};
