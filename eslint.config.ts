import type { FlatConfig } from "@typescript-eslint/utils/ts-eslint";

import eslint from "@eslint/js";
import eslintPluginImportX from "eslint-plugin-import-x";
import perfectionist from "eslint-plugin-perfectionist";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import { configs as sonarjs } from "eslint-plugin-sonarjs";
import tseslint, { configs } from "typescript-eslint";

/* -------------------------------------------------------------------------- */

const ignores = ["**/index.js", "**/index.d.ts"],
  projectService = true,
  tsconfigRootDir = import.meta.dirname,
  parserOptions = { projectService, tsconfigRootDir },
  languageOptions = { parserOptions },
  rules: FlatConfig.Rules = {
    "@typescript-eslint/no-use-before-define": ["error", "nofunc"],
    "import-x/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: ["**/eslint.config.ts", "**/build.ts"],
        optionalDependencies: false,
      },
    ],
  };

/* -------------------------------------------------------------------------- */

export default tseslint.config(
  { ignores },
  { rules },
  { languageOptions },
  eslint.configs.recommended,
  eslintPluginImportX.flatConfigs.recommended,
  eslintPluginImportX.flatConfigs.typescript,
  configs.strictTypeChecked,
  configs.stylisticTypeChecked,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  sonarjs.recommended,
  perfectionist.configs["recommended-natural"],
  eslintPluginPrettierRecommended,
);
