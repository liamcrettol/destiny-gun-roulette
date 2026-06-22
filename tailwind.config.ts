import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bungie: {
          blue: "#00aeef",
          dark: "#0d1117",
          surface: "#161b22",
          border: "#30363d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
