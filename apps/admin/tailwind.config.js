/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.25rem',
        lg: '2rem',
        xl: '2rem',
      },
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        background: 'rgb(var(--background))',
        foreground: 'rgb(var(--foreground))',
        muted: 'rgb(var(--muted))',
        border: 'rgb(var(--border))',
        surface: 'rgb(var(--surface))',
        card: 'rgb(var(--card))',
        ring: 'var(--ring)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-on-primary)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-on-accent)',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 2px 6px rgba(16, 24, 40, 0.08)',
        'card-hover': '0 6px 18px rgba(16, 24, 40, 0.14), 0 2px 8px rgba(16, 24, 40, 0.10)',
      },
      borderRadius: {
        xl: '12px',
      },
      fontSize: {
        xs: ['0.75rem', '1.25rem'],
      },
      backgroundImage: {
        'grad-primary': 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
      },
      ringColor: {
        DEFAULT: 'var(--ring)',
      },
    },
  },
  plugins: [],
}

