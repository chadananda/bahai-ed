/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}", "./api/**/*.{js,ts}"],
  theme: {
    screens: {
      xs: '475px',
      ...defaultTheme.screens,
    },
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
				foreground: 'hsl(var(--foreground) / <alpha-value>)',
      },
      typography: (theme) => ({
        DEFAULT: {
          quoteless: {
            css: {
              'blockquote p:first-of-type::before': { content: 'none' },
              'blockquote p:first-of-type::after': { content: 'none' },
            },
          },
          css: {
            maxWidth: '750px !important',
            fontSize: "1.1rem",
            color: theme("colors.gray.800"),
            a: {
              color: theme("colors.blue.700 !important"),
              "&:hover": {
                color: theme("colors.blue.800"),
              },
            },
            strong: {
              color: theme("colors.gray.900"),
            },
            "ol > li::before": {
              color: theme("colors.gray.500"),
            },
            "ul > li::before": {
              backgroundColor: theme("colors.gray.400"),
            },
            hr: {
              borderColor: theme("colors.gray.200"),
            },
            blockquote: {
              color: theme("colors.gray.900"),
              borderLeftColor: theme("colors.gray.200"),
            },
            h1: {
              color: theme("colors.gray.900"),
            },
            h2: {
              color: theme("colors.gray.900"),
            },
            h3: {
              color: theme("colors.gray.900"),
            },
            h4: {
              color: theme("colors.gray.900"),
            },
            "figure figcaption": {
              color: theme("colors.gray.500"),
            },
            code: {
              color: theme("colors.gray.900"),
            },
            "a code": {
              color: theme("colors.blue.500"),
            },
            pre: {
              color: theme("colors.gray.200"),
              backgroundColor: theme("colors.gray.800"),
            },
            thead: {
              color: theme("colors.gray.900"),
              borderBottomColor: theme("colors.gray.400"),
            },
            "tbody tr": {
              borderBottomColor: theme("colors.gray.200"),
            },
          },
        },
      }),
      fontFamily: {
        sans: ["Inter Variable", "Inter", ...defaultTheme.fontFamily.sans],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      animation: {
        marquee: "marquee 50s linear infinite",
      },
      keyframes: {
        marquee: {
          from: {
            transform: "translateX(0)",
          },
          to: {
            transform: "translateX(calc(-100% - 2.5rem))",
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
