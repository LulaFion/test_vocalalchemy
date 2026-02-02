/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyber-Alchemist Theme
        'canvas': '#0D0221',        // Midnight Abyss - Main background
        'surface': '#190E2F',       // Deep Nebula - Cards, panels
        'surface-hover': '#241545', // Hover state for surfaces
        'primary': '#BD00FF',       // Electric Purple - Primary buttons
        'primary-hover': '#D44FFF', // Lighter purple for hover
        'secondary': '#00F0FF',     // Cyber Cyan - Waveforms, active states
        'secondary-hover': '#4FF5FF', // Lighter cyan for hover
        'accent': '#FF007A',        // Neon Pink - Alerts, high energy
        'accent-hover': '#FF4D9F',  // Lighter pink for hover
        'text-primary': '#FFFFFF',  // White text
        'text-secondary': '#A0A0B0', // Muted text
        'text-muted': '#6B6B7B',    // Dimmed text
        'border': '#2D1F4A',        // Subtle borders
      },
      fontFamily: {
        'display': ['Orbitron', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(189, 0, 255, 0.3)',
        'glow-secondary': '0 0 20px rgba(0, 240, 255, 0.3)',
        'glow-accent': '0 0 20px rgba(255, 0, 122, 0.3)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'waveform': 'waveform 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(189, 0, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(189, 0, 255, 0.5)' },
        },
        'waveform': {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.5)' },
        },
      },
    },
  },
  plugins: [],
}
