/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        'tea-green': '#ccd5ae',
        'beige': '#e9edc9',
        'cornsilk': '#fefae0',
        'papaya-whip': '#faedcd',
        'bronze': '#d4a373',
        'ink-black': '#01161e',
        'dark-teal': '#124559',
        'air-force-blue': '#598392',
        'ash-grey': '#aec3b0',
        'light-beige': '#eff6e0',
      },
      fontFamily: {
        'headline': ['Manrope', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'label': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
