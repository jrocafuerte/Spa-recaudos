import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Estilos solo vía Design Tokens / clases de globals.css (también exigido por la CSP: sin estilos inline).
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message: "Usa tokens (var(--color-*)) en lugar de colores fijos. Ver design-tokens/README.md",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Sin estilos inline: usa clases de globals.css basadas en tokens.",
        },
      ],
    },
  },
]);

export default eslintConfig;
