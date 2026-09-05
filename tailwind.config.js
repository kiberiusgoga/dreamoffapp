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
                // Semantic, not decorative: this is the only red in the app.
                // It exists so "something went wrong" and "this is our brand"
                // stop being the same hue, which is what made the auth screen
                // read as a different product. 6.41:1 on #0d1117 — AA for the
                // small text it carries.
                danger: "#E0796B",

                // Surfaces the auth screen used to hardcode.
                authSurface: "#161b22",
                authSurfaceDeep: "#0d1117",
            },
            fontFamily: {
                // The variable packages register these exact family names; the
                // static names and system stacks are the fallback chain. Note
                // Playfair Display ships no Greek subset, so Greek headings
                // fall through to Georgia.
                serif: ['"Playfair Display Variable"', '"Playfair Display"', 'Georgia', 'serif'],
                sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 0 15px rgba(191, 167, 111, 0.3)',
            },
            // These animations were used in 13 places across the app before
            // they existed. Without the keyframes below, Tailwind emitted
            // nothing and every one of those classes was inert.
            keyframes: {
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'fade-in-down': {
                    from: { opacity: '0', transform: 'translateY(-8px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'slide-up': {
                    from: { opacity: '0', transform: 'translateY(12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'bounce-in': {
                    '0%': { opacity: '0', transform: 'scale(0.92)' },
                    '60%': { opacity: '1', transform: 'scale(1.02)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
            animation: {
                'fade-in': 'fade-in 300ms ease-out both',
                'fade-in-down': 'fade-in-down 350ms ease-out both',
                'slide-up': 'slide-up 350ms ease-out both',
                'bounce-in': 'bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
            },
        },
    },
    plugins: [],
}
