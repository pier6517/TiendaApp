/** @type {import('tailwindcss').Config} */
export default {
  // Archivos donde Tailwind buscará clases para purgar en producción
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // Dark mode via clase en el HTML root
  darkMode: 'class',
  theme: {
    extend: {
      // Paleta de colores del sistema
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        // Verde para acciones positivas (ventas, ingresos)
        success: {
          50:  '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        // Rojo para alertas (deudas vencidas, stock crítico)
        danger: {
          50:  '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        // Amarillo para advertencias (stock bajo, mora)
        warning: {
          50:  '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
      },
      // Fuentes
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Sombras personalizadas para cards
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
