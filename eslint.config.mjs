import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
  {
    rules: {
      // ── TypeScript strict rules ──────────────────────────────────
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // ── General strict rules ─────────────────────────────────────
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-implicit-coercion": "error",
      "prefer-const": "error",
      "no-var": "error",
      curly: ["error", "all"],

      // ── React ────────────────────────────────────────────────────
      // New in eslint-config-next 16 (React Compiler rules). Existing effects
      // that sync with the URL / fetch are intentional; flag, don't fail.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;