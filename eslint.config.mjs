// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import jest from "eslint-plugin-jest";

export default tseslint.config(
  {
    ignores: ["dist/*", "*.js"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["tests/**"],
    ...jest.configs["flat/recommended"],
  },
);
