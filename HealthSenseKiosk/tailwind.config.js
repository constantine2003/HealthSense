/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // You can add kiosk-specific colors here later
      colors: {
        health: {
          blue: '#3b82f6',
          green: '#10b981',
          dark: '#0f172a'
        }
      }
    },
  },
  plugins: [],
}