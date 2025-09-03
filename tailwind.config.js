/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4338ca',
          dark: '#312e81',
          light: '#6366f1',
        },
      },
    },
  },
  plugins: [],
}
