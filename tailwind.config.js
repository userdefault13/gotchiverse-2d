/* eslint-env node */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  autoprefixer: false,
  darkMode: 'class',
  corePlugins: {
    preflight: false, // @TODO: set to true someday...
  },
  plugins: [require('tailwindcss-debug-screens')],
};
