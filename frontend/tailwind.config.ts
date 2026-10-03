import type { Config } from "tailwindcss";

// Palette: near-black neutrals + cyan (main accent) + copper (warnings/errors/running only).
// Token names kept so existing pages keep working; violet is intentionally the same as cyan.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0D0E10",
        base2: "#121417",
        surface: "#181B1F",
        line: "#262A30",
        paper: "#ECECEA",
        mute: "#8B9099",
        cyan: "#22D3EE",
        violet: "#22D3EE",
        pink: "#E08A5B",
        amber: "#E08A5B",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        card: "12px",
        pill: "999px",
      },
      boxShadow: {
        "glow-cyan": "0 0 0 1px rgba(34,211,238,0.45)",
        "glow-violet": "0 0 0 1px rgba(34,211,238,0.45)",
        "glow-pink": "0 0 0 1px rgba(224,138,91,0.45)",
        "glow-soft": "none",
      },
    },
  },
  plugins: [],
};
export default config;