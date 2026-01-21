/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#000000",
                surface: "#0A0F1F", // Deep Midnight Blue
                surfaceLight: "#1A1A1A", // Dark Soft Grey
                border: "#BFA76F", // Antique Gold
                primary: "#E9D8A6", // Soft Gold / Parchment
                accent: "#d4af37", // Antique Gold
                actionPrimary: "#800000", // Burgundy
                actionHover: "#600000",
            },
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
                sans: ['"Inter"', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 0 15px rgba(191, 167, 111, 0.3)',
            }
        },
    },
    plugins: [],
}
