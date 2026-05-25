import { configs } from "eslint";

export default [
  {
    ...configs.recommended,
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        node: true,
        es2022: true,
      },
    },
    plugins: {
      prettier: require("eslint-plugin-prettier"),
    },
    rules: {
      ...configs.recommended.rules,
      "prettier/prettier": "error",
    },
  },
];
