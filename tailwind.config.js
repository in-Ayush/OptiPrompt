/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#09090A", // Premium matte black background
          card: "#161618", // Slightly lighter matte black cards
          border: "#2D2D30", // Dark silver borders
          text: "#E3E3E6", // High readability silver-gray text
          accent: "#A0A0A5", // Medium silver for secondary accents
          primary: "#E4E4E7", // Bright silver for primary elements
          secondary: "#71717A" // Zinc gray
        }
      }
    },
  },
  plugins: [],
}
