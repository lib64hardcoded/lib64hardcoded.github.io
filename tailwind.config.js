/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      transitionProperty: {
        'theme': 'background-color, color, border-color',
      },
      transitionDuration: {
        '2000': '2000ms',
      }
    },
  },
  plugins: [],
};