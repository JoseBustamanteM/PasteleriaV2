/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

// Paleta "Dulce": neutros cálidos (cacao) y frambuesa como color principal.
// Se redefinen `gray` y `red` para que todas las pantallas hereden la paleta.
const cacao = {
  50: '#FFF6F3',
  100: '#F7ECE8',
  200: '#EBDDD8',
  300: '#D9C6BF',
  400: '#9C8078',
  500: '#8A6A62',
  600: '#6B4A42',
  700: '#573A33',
  800: '#3A2320',
  900: '#2A1815',
};

const frambuesa = {
  50: '#FFF0F4',
  100: '#FFE3EC',
  200: '#FFC7D8',
  300: '#F79AB8',
  400: '#EC6A94',
  500: '#D63F73',
  600: '#B8235A',
  700: '#8E1A45',
  800: '#6E1536',
  900: '#4F0F27',
};

module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        gray: cacao,
        red: frambuesa,
        cacao,
        frambuesa,
        crema: '#FFF0D9',
        // Alias antiguos, apuntando a la nueva paleta
        'cereza': frambuesa[600],
        'nieve': '#FFFFFF',
        'gris-claro': cacao[50],
        'gris-oscuro': cacao[800],
      },
      fontFamily: {
        sans: ['Nunito', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        suave: '0 2px 10px rgba(58, 35, 32, 0.05)',
        flotante: '0 10px 30px rgba(58, 35, 32, 0.3)',
        frambuesa: '0 10px 24px rgba(184, 35, 90, 0.35)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
