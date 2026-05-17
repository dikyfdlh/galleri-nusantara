/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        batik: {
          50: '#fbf6ef',
          100: '#f3e3cc',
          200: '#e7c79a',
          300: '#d9a564',
          400: '#cd8a3e',
          500: '#b6722f',
          600: '#915827',
          700: '#6f4322',
          800: '#4f301c',
          900: '#3a2417',
        },
      },
      fontFamily: {
        display: ['"Segoe UI"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
