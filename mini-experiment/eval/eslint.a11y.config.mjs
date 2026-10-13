import tsParser from "@typescript-eslint/parser";
import jsxA11y from "eslint-plugin-jsx-a11y";

export const JSX_COMPONENT_MAP = { Image: "img", Link: "a" };

const config = [
  {
    ...jsxA11y.flatConfigs.strict,
    files: ["**/*.{jsx,tsx}"],
    languageOptions: {
      ...jsxA11y.flatConfigs.strict.languageOptions,
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { "jsx-a11y": { components: JSX_COMPONENT_MAP } },
  },
];

export default config;
