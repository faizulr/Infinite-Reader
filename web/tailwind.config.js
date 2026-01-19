/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['Merriweather', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        sepia: {
          50: '#faf6f1',
          100: '#f5ede0',
          200: '#e8d9c0',
          300: '#d9c19c',
          400: '#c5a575',
          500: '#b48c52',
          600: '#9a7341',
          700: '#7c5a35',
          800: '#5e432a',
          900: '#3f2d1f',
        },
      },
      maxWidth: {
        'prose': '65ch',
      },
    },
  },
  plugins: [],
}
