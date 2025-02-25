/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
    colors: {
      'gold-accent': '#E5BF7D',
    },
    backgroundImage: {
      'luxury-gradient': 'linear-gradient(140deg, #0A0908 0%, #171717 100%)',
    },
    rotate: {
      '-15': '-15deg', // Add negative rotation support
    }},
  },
  plugins: [
    require('daisyui'),
    require('flowbite/plugin') 

  ],
}

