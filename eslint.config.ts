import eslint from "@eslint/js";
import eslintPluginImportX from "eslint-plugin-import-x";
import perfectionist from "eslint-plugin-perfectionist";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import tseslint, { configs } from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/index.js", "**/index.d.ts"] },
  {
    rules: {
      "@typescript-eslint/no-use-before-define": ["error", "nofunc"],
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: ["**/eslint.config.ts"],
          optionalDependencies: false,
        },
      ],
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["eslint.config.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslint.configs.recommended,
  eslintPluginImportX.flatConfigs.recommended,
  eslintPluginImportX.flatConfigs.typescript,
  configs.strictTypeChecked,
  configs.stylisticTypeChecked,
  perfectionist.configs["recommended-natural"],
  eslintPluginPrettierRecommended,
);
