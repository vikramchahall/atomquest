/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontSize: {
        xs:   ['0.75rem',  { lineHeight: '1rem' }],
        sm:   ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem',     { lineHeight: '1.5rem' }],
        lg:   ['1.125rem', { lineHeight: '1.75rem' }],
        xl:   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':['1.5rem',   { lineHeight: '2rem' }],
        '3xl':['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':['2.25rem',  { lineHeight: '2.5rem' }],
      },
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          900: "#0c4a6e",
        },
        accent: {
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
        },
        dark: {
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      animation: {
        "slide-in":  "slideIn 0.3s ease-out",
        "fade-in":   "fadeIn 0.4s ease-out",
        "pulse-dot": "pulseDot 2s infinite",
      },
      keyframes: {
        slideIn:  { "0%": { transform: "translateX(-10px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        fadeIn:   { "0%": { opacity: "0", transform: "translateY(8px)" },   "100%": { opacity: "1", transform: "translateY(0)" } },
        pulseDot: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
      },
    },
  },
  plugins: [],
};