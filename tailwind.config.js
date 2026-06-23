/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}", // <-- ESTA LÍNEA ES VITAL
  ],
  theme: {
    extend: {
      colors: {
        'cereza': '#E63946',
        'nieve': '#FFFFFF',
        'gris-claro': '#F9F9F9',
        'gris-oscuro': '#333333'
      }
    },
  },
  plugins: [],
}
