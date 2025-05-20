import react from "@eslint-react/eslint-plugin";
import { FlatCompat } from "@eslint/eslintrc";
import eslint from "@eslint/js";
import stylisticJsx from "@stylistic/eslint-plugin-jsx";
import prettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import n from "eslint-plugin-n";
import perfectionist from "eslint-plugin-perfectionist";
import * as regexpPlugin from "eslint-plugin-regexp";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint, { configs } from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

/** @type {import("eslint").Linter.Config[]} */
const config = [
  eslint.configs.recommended,
  ...compat.extends("next/core-web-vitals"),
  ...tseslint.config(
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
    },
    {
      extends: [...configs.strictTypeChecked, ...configs.stylisticTypeChecked],
      files: ["**/*.{cts,mts,ts,tsx}"],
      rules: {
        "@typescript-eslint/no-empty-object-type": [
          "error",
          {
            allowInterfaces: "with-single-extends",
          },
        ],
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            ignoreRestSiblings: true,
          },
        ],
      },
    },
    {
      files: ["**/*.{ts,tsx}"],
      ...react.configs["recommended-type-checked"],
    },
    {
      files: ["**/*.{ts,tsx}"],
      plugins: {
        jsx: stylisticJsx,
      },
      rules: {
        "jsx/jsx-child-element-spacing": "error",
        "jsx/jsx-curly-brace-presence": [
          "error",
          {
            propElementValues: "always",
          },
        ],
        "jsx/jsx-self-closing-comp": "error",
      },
    },
  ),

  prettier,
  //
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  //
  perfectionist.configs["recommended-natural"],
  //
  unicorn.configs.recommended,
  {
    rules: {
      "unicorn/filename-case": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/no-nested-ternary": "off",
      "unicorn/no-null": "off",
      "unicorn/prefer-node-protocol": "off",
      "unicorn/prevent-abbreviations": "off",
    },
  },
  //
  regexpPlugin.configs["flat/recommended"],
  //
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      n: n,
    },
    rules: {
      ...n.configs["flat/recommended"].rules,
    },
  },
  {
    rules: {
      "n/no-missing-import": "off",
      "n/no-unsupported-features/es-syntax": ["error", { version: ">=22.0.0" }],
      "n/no-unsupported-features/node-builtins": [
        "error",
        { ignores: ["crypto"], version: ">=22.0.0" },
      ],
    },
  },
];

/** Ignore ShadCN-generated UI components */
config.unshift({
  ignores: ["src/components/ui/**", "src/hooks/**", "supabase"],
})

export default config;
