/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#ecf3ff",
          100: "#d6e7ff",
          200: "#b7d3ff",
          300: "#8bb7ff",
          400: "#5694ff",
          500: "#2f74ff",
          600: "#1b5fe6",
          700: "#164db9",
          800: "#153f8f",
          900: "#142f66",
        },
      },
      boxShadow: {
        brand: "0 10px 30px rgba(18,53,120,.35)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};
