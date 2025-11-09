import { dirname } from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";
import unsedImports from "eslint-plugin-unused-imports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),

  {
    plugins: {
      "unused-imports": unsedImports,
    },
    rules: {
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Typescript specific rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
        },
      ],

      // React specific rules
      "react/jsx-key": "error",
      "react/no-array-index-key": "error",
      "react/self-closing-comp": "error",
      "react/jsx-pascal-case": "error",
      "react/jsx-no-duplicate-props": "error",

      // console rules
      "no-console": [
        "warn",
        {
          allow: ["warn", "error"],
        },
      ],
      "prefer-const": "warn",
      "no-var": "error",
    },
  },

  {
    files: ["**/*js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**"],
    rules: {
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
    },
  },

  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      camelcase: [
        "error",
        {
          properties: "never",
          ignoreDestructuring: true,
        },
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
          filter: {
            regex: "^[A-Z]",
            match: true,
          },
        },
        {
          selector: "function",
          format: ["camelCase"],
          filter: {
            regex: "^use[A-Z]",
            match: true,
          },
        },
      ],
    },
  },

  {
    files: ["src/app/**/*.tsx"],
    rules: {
      "import/no-default-export": "off",
    },
  },

  {
    files: ["**/*.js", "**/*.jsx"],
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default eslintConfig;
