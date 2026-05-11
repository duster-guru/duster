/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#06070D",
        surface: "#0E1119",
        elevated: "#161A26",
        hairline: "rgba(255,255,255,0.08)",
        text: {
          primary: "#F4F6FB",
          secondary: "#A6ADBE",
          muted: "#5A6175",
        },
        sweep: {
          DEFAULT: "#7CFFB2",
          glow: "rgba(124,255,178,0.40)",
        },
        electric: "#5B8CFF",
        // Brand accents — bumped from #FF4FD8/#FFD27A so 11–14px text on
        // dark backgrounds clears WCAG AA (~4.5:1). Hue preserved, only
        // luminance raised, so brand identity stays put.
        magenta: "#FF6EE0",
        gold: "#FFE08A",
        success: "#34E1A2",
        warn: "#FFB257",
        danger: "#FF6B7A",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        money: ["56px", { lineHeight: "60px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "display-xl": ["56px", { lineHeight: "60px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-l": ["40px", { lineHeight: "44px", letterSpacing: "-0.015em", fontWeight: "700" }],
        h1: ["28px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        h2: ["22px", { lineHeight: "28px", letterSpacing: "-0.005em", fontWeight: "600" }],
        "body-l": ["17px", { lineHeight: "24px", fontWeight: "500" }],
        body: ["15px", { lineHeight: "22px", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "18px", fontWeight: "500" }],
        micro: ["11px", { lineHeight: "14px", letterSpacing: "0.04em", fontWeight: "600" }],
      },
      borderRadius: {
        xs: "8px",
        sm: "12px",
        md: "20px",
        lg: "28px",
      },
      boxShadow: {
        cta: "0 0 32px rgba(124,255,178,0.50), 0 0 8px rgba(124,255,178,0.80)",
        "cta-magenta": "0 0 32px rgba(255,79,216,0.50), 0 0 8px rgba(255,79,216,0.80)",
        sheet: "0 -16px 48px rgba(0,0,0,0.60)",
      },
      backgroundImage: {
        "grad-found": "linear-gradient(135deg, #7CFFB2 0%, #5B8CFF 50%, #FF4FD8 100%)",
        "grad-void": "radial-gradient(ellipse at center, #0E1119 0%, #06070D 100%)",
        "grad-mint-gold": "linear-gradient(135deg, #7CFFB2 0%, #FFD27A 100%)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "ring-out": "ringOut 2s ease-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 32px rgba(124,255,178,0.40), 0 0 8px rgba(124,255,178,0.60)" },
          "50%": { boxShadow: "0 0 48px rgba(124,255,178,0.80), 0 0 16px rgba(124,255,178,0.95)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        ringOut: {
          "0%": { transform: "scale(0.6)", opacity: "0.8" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
