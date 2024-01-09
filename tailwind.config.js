const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import("@types/tailwindcss/tailwind-config").TailwindConfig } */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    minWidth: {
      7: '1.75rem'
    },
    colors: {
      transparent: 'transparent',
      white: '#ffffff',
      black: '#000000',
      primary: '#E94B4E',
      gray: {
        body: '#6E6B7B',
        heading: '#5E5873',
        input: '#D8D6DE',
        'table-header': '#F3F2F7',
        50: '#F8F8F8',
        100: '#f3f2f7',
        200: '#EFEFEF',
        300: '#E3E3E3',
        400: '#b0b2b9',
        500: '#8B8B8B',
        600: '#4b5563',
        700: '#515151',
        800: '#252f3f',
        900: '#161e2e'
      },
      cyan: {
        50: '#ecfeff',
        100: '#cffafe',
        200: '#a5f3fc',
        300: '#67e8f9',
        400: '#22d3ee',
        500: '#06b6d4',
        600: '#0891b2',
        700: '#0e7490',
        800: '#155e75',
        900: '#164e63'
      },
      'cool-gray': {
        50: '#fbfdfe',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cfd8e3',
        400: '#97a6ba',
        500: '#64748b',
        600: '#475569',
        700: '#364152',
        800: '#27303f',
        900: '#1a202e'
      },
      red: {
        50: '#fdf2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
        pnp: '#E94B4E'
      },
      orange: {
        50: '#fff7ed',
        100: '#ffedd5',
        200: '#fed7aa',
        300: '#fdba74',
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
        700: '#c2410c',
        800: '#9a3412',
        900: '#7c2d12'
      },
      yellow: {
        50: '#fdfdea',
        100: '#fdf6b2',
        200: '#fce96a',
        300: '#faca15',
        400: '#e3a008',
        500: '#c27803',
        600: '#9f580a',
        700: '#8e4b10',
        800: '#723b13',
        900: '#633112'
      },
      green: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d'
      },
      lime: {
        50: '#f7fee7',
        100: '#ecfccb',
        200: '#d9f99d',
        300: '#bef264',
        400: '#a3e635',
        500: '#84cc16',
        600: '#65a30d',
        700: '#4d7c0f',
        800: '#3f6212',
        900: '#365314'
      },
      emerald: {
        50: '#ecfdf5',
        100: '#d1fae5',
        200: '#a7f3d0',
        300: '#6ee7b7',
        400: '#34d399',
        500: '#10b981',
        600: '#059669',
        700: '#047857',
        800: '#065f46',
        900: '#064e3b'
      },
      teal: {
        50: '#edfafa',
        100: '#d5f5f6',
        200: '#afecef',
        300: '#7edce2',
        400: '#16bdca',
        500: '#0694a2',
        600: '#047481',
        700: '#036672',
        800: '#05505c',
        900: '#014451'
      },
      blue: {
        50: '#ebf5ff',
        100: '#e1effe',
        200: '#c3ddfd',
        300: '#a4cafe',
        400: '#76a9fa',
        500: '#3f83f8',
        600: '#1c64f2',
        700: '#1a56db',
        800: '#1e429f',
        900: '#233876'
      },
      indigo: {
        50: '#f0f5ff',
        100: '#e5edff',
        200: '#cddbfe',
        300: '#b4c6fc',
        400: '#8da2fb',
        500: '#6875f5',
        600: '#5850ec',
        700: '#5145cd',
        800: '#42389d',
        900: '#362f78'
      },
      purple: {
        50: '#f6f5ff',
        100: '#edebfe',
        200: '#dcd7fe',
        300: '#cabffd',
        400: '#ac94fa',
        500: '#9061f9',
        600: '#7e3af2',
        700: '#6c2bd9',
        800: '#5521b5',
        900: '#4a1d96'
      },
      pink: {
        50: '#fdf2f8',
        100: '#fce8f3',
        200: '#fad1e8',
        300: '#f8b4d9',
        400: '#f17eb8',
        500: '#e74694',
        600: '#d61f69',
        700: '#bf125d',
        800: '#99154b',
        900: '#751a3d'
      }
    },
    extend: {
      borderWidth: {
        3: '3px'
      },
      boxShadow: {
        sm: '0px 0px 14px rgba(0,0,0,0.05)',
        default: '0px 4px 24px rgba(0, 0, 0, 0.06)'
      },
      borderRadius: {
        default: '7px'
      },
      maxHeight: {
        0: '0',
        xl: '36rem'
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans]
      }
    }
  },
  variants: {
    backgroundColor: [
      'hover',
      'focus',
      'active',
      'odd',
      'dark',
      'dark:hover',
      'dark:focus',
      'dark:active',
      'dark:odd',
      'disabled'
    ],
    display: ['responsive', 'dark'],
    textColor: [
      'focus-within',
      'hover',
      'active',
      'dark',
      'dark:focus-within',
      'dark:hover',
      'dark:active',
      'disabled'
    ],
    placeholderColor: ['focus', 'dark', 'dark:focus'],
    borderColor: ['focus', 'hover', 'dark', 'dark:focus', 'dark:hover', 'disabled'],
    divideColor: ['dark'],
    boxShadow: ['focus', 'dark:focus', 'disabled']
  },
  plugins: [
    require('@vueform/slider/tailwind'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/line-clamp'),
    require('@tailwindcss/aspect-ratio')
  ]
}
