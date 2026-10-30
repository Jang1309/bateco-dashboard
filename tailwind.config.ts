import type { Config } from "tailwindcss"
import plugin from "tailwindcss/plugin"

const config: Config = {
  content: ["./src/**/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // Desktop-first app UI: use xsm: for mobile only (max-width 639px)
      screens: {
        xsm: { max: "639px" },
      },
      fontFamily: {},
      colors: {},
      backgroundImage: {},
      boxShadow: {},
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".flex-center": {
          "@apply flex items-center justify-center": {},
        },
        ".flex-y-center": {
          "@apply flex items-center": {},
        },
        ".flex-x-center": {
          "@apply flex justify-center": {},
        },
        ".absolute-center": {
          "@apply absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2":
            {},
        },
        ".absolute-x-center": {
          "@apply absolute left-1/2 -translate-x-1/2": {},
        },
        ".absolute-y-center": {
          "@apply absolute top-1/2 -translate-y-1/2": {},
        },
      })
    }),
  ],
}

export default config
