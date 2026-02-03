/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: '#F5F5F0',
                turquoise: '#00CED1',
                sunflower: '#FFB800',
            },
            maxWidth: {
                'mobile': '450px',
            }
        },
    },
    plugins: [],
}
