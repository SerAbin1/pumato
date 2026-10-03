import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import * as espree from "espree";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    // eslint-config-next's bundled Babel parser lacks scopeManager.addGlobals,
    // which ESLint 10 requires. Use ESLint's default parser instead.
    languageOptions: {
      parser: espree,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // eslint-plugin-react's "detect" calls context.getFilename, removed in ESLint 10.
    settings: { react: { version: "19.3" } },
    rules: {
      "no-unused-vars": "warn",
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
