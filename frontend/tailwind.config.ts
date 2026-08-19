import type { Config } from 'tailwindcss';

/**
 * Learnova design tokens — grounded in Ghanaian/West-African education:
 *  brand green (growth) · gold (achievement, Ghana's gold) · ink (clarity) · coral (energy/streaks)
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#0E7C5A', dark: '#0a5d43', light: '#34D399', soft: '#ECFDF5' },
        gold: { DEFAULT: '#F2A900', dark: '#C98A00', soft: '#FFF7E6' },
        coral: { DEFAULT: '#FF6B5A', soft: '#FFEDEA' },
        ink: { DEFAULT: '#0F1B2D', soft: '#3A4A5E' },
      },
      fontFamily: { sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgba(15,27,45,0.04), 0 8px 24px -12px rgba(15,27,45,0.10)',
        lift: '0 8px 30px -8px rgba(14,124,90,0.25)',
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
    },
  },
  plugins: [],
};
export default config;
