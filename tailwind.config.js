/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ars-primary': '#0969a9',
        'ars-secondary': '#f7c12b',
        'ars-heading': '#383838',
        'ars-body': '#727272',
        'ars-white': '#FFFFFF',
      },
    },
  },
  plugins: [],
};
