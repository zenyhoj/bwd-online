/** @type {import('tailwindcss').Config} */
const colorVar = (name) => `oklch(var(${name}) / <alpha-value>)`;

const config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./actions/**/*.{ts,tsx}",
    "./schemas/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: colorVar("--border"),
        input: colorVar("--input"),
        ring: colorVar("--ring"),
        background: colorVar("--background"),
        foreground: colorVar("--foreground"),
        primary: {
          DEFAULT: colorVar("--primary"),
          foreground: colorVar("--primary-foreground")
        },
        secondary: {
          DEFAULT: colorVar("--secondary"),
          foreground: colorVar("--secondary-foreground")
        },
        destructive: {
          DEFAULT: colorVar("--destructive"),
          foreground: colorVar("--destructive-foreground")
        },
        muted: {
          DEFAULT: colorVar("--muted"),
          foreground: colorVar("--muted-foreground")
        },
        accent: {
          DEFAULT: colorVar("--accent"),
          foreground: colorVar("--accent-foreground")
        },
        card: {
          DEFAULT: colorVar("--card"),
          foreground: colorVar("--card-foreground")
        },
        popover: {
          DEFAULT: colorVar("--popover"),
          foreground: colorVar("--popover-foreground")
        },
        chart: {
          1: colorVar("--chart-1"),
          2: colorVar("--chart-2"),
          3: colorVar("--chart-3"),
          4: colorVar("--chart-4"),
          5: colorVar("--chart-5")
        },
        sidebar: {
          DEFAULT: colorVar("--sidebar"),
          foreground: colorVar("--sidebar-foreground"),
          primary: colorVar("--sidebar-primary"),
          "primary-foreground": colorVar("--sidebar-primary-foreground"),
          accent: colorVar("--sidebar-accent"),
          "accent-foreground": colorVar("--sidebar-accent-foreground"),
          border: colorVar("--sidebar-border"),
          ring: colorVar("--sidebar-ring")
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        heading: ["var(--font-heading)", "var(--font-sans)", "ui-sans-serif", "system-ui"]
      },
      keyframes: {
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "pulse-slow": {
          "0%, 100%": {
            opacity: "1"
          },
          "50%": {
            opacity: "0.8"
          }
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 0.8s ease-out forwards",
        "pulse-slow": "pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};

module.exports = config;
