// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx,js,jsx,html}"
  ],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent-color)',
      },
      borderColor: {
        accent: 'var(--accent-color)',
      },
      ringColor: {
        accent: 'var(--accent-color)',
      },
      backgroundColor: {
        accent: 'var(--accent-color)',
      },
      textColor: {
        accent: 'var(--accent-color)',
      },
    },
  },
  plugins: [],
}