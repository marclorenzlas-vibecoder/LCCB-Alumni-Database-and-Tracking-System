/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lccb-blue': {
          50: '#e6f1ff',
          100: '#b3d7ff',
          200: '#80bdff',
          300: '#4da3ff',
          400: '#1a89ff',
          500: '#0070e6',
          600: '#0057b3',
          700: '#003d80',
          800: '#00244d',
          900: '#000b1a'
        }
      }
    },
  },
  plugins: [],
};