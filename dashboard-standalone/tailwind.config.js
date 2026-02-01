/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                neuro: {
                    DEFAULT: '#818CF8',
                    dark: '#6366F1',
                    light: '#EEF2FF',
                },
                brand: {
                    primary: '#18181B',
                    secondary: '#3F3F46',
                    accent: '#818CF8',
                },
                accent: {
                    DEFAULT: '#10B981',
                    light: '#D1FAE5',
                    dark: '#059669',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            }
        },
    },
    plugins: [],
}
