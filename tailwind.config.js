/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
     colors:{
      'dijle-dark-blue': "#254795",
      'dijle-light-blue':"#52B1DD"
     },
    },
  },
  plugins: [
    function({ addVariant }) {
      addVariant('date-tooltip-group-hover', '.date-tooltip-group:hover &')
    },
  ],
};
