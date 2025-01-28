import type { FlatConfig } from "@typescript-eslint/utils/ts-eslint";
import type { Linter } from "eslint";

import { FlatCompat } from "@eslint/eslintrc";
import eslint from "@eslint/js";
import eslintPluginImportX from "eslint-plugin-import-x";
import perfectionist from "eslint-plugin-perfectionist";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import tseslint, { configs } from "typescript-eslint";

import eslintrc from "./.eslintrc.json";

/* -------------------------------------------------------------------------- */

const compat = new FlatCompat(),
  ignores = ["**/index.js", "**/index.d.ts"],
  projectService = true,
  tsconfigRootDir = import.meta.dirname,
  parserOptions = { projectService, tsconfigRootDir },
  languageOptions = { parserOptions },
  rules: FlatConfig.Rules = {
    "@typescript-eslint/no-shadow": "error",
    "@typescript-eslint/no-use-before-define": "error",
    "import-x/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: ["**/eslint.config.ts", "**/build.ts"],
        optionalDependencies: false,
      },
    ],
    "no-shadow": "off",
    "no-use-before-define": "off",
  };

/* -------------------------------------------------------------------------- */

export default tseslint.config(
  { ignores },
  { rules },
  { languageOptions },
  ...compat.config(eslintrc as Linter.LegacyConfig),
  eslint.configs.recommended,
  eslintPluginImportX.flatConfigs.recommended,
  eslintPluginImportX.flatConfigs.typescript,
  configs.strictTypeChecked,
  configs.stylisticTypeChecked,
  perfectionist.configs["recommended-natural"],
  eslintPluginPrettierRecommended,
);
