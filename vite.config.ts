import { defineConfig } from "vite-plus";
import { fileURLToPath } from "node:url";

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./", import.meta.url)),
        },
    },
    staged: {
        "*": "vp check --fix --no-error-on-unmatched-pattern",
    },
    test: {
        // Vitest v4 compatibility: preserve mock call history.
        // Remove after tests no longer rely on calls from setup or earlier tests.
        // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
        // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
        clearMocks: false,
        include: ["tests/unit/**/*.test.{ts,tsx}"],
        exclude: ["tests/e2e/**"],
    },
    fmt: {
        tabWidth: 4,
        useTabs: false,
        semi: true,
        singleQuote: false,
        trailingComma: "es5",
        printWidth: 100,
        sortPackageJson: false,
        ignorePatterns: [],
    },
    lint: {
        plugins: ["react", "nextjs", "jsx-a11y", "import", "typescript", "unicorn", "oxc"],
        categories: {
            correctness: "error",
        },
        env: {
            browser: true,
            node: true,
            es2024: true,
        },
        rules: {
            "no-unused-vars": "warn",
            "react/rules-of-hooks": "error",
            "react/exhaustive-deps": "warn",
            "nextjs/no-img-element": "warn",
            "nextjs/no-html-link-for-pages": "warn",
            "typescript/consistent-type-imports": "warn",
            "typescript/no-explicit-any": "warn",
            "jsx-a11y/label-has-associated-control": "warn",
            "jsx-a11y/no-static-element-interactions": "warn",
            "jsx-a11y/click-events-have-key-events": "warn",
            "jsx-a11y/anchor-is-valid": "warn",
            "jsx-a11y/prefer-tag-over-role": "warn",
            "jsx-a11y/control-has-associated-label": "warn",
            "react/purity": "warn",
            "react/preserve-manual-memoization": "warn",
            "vite-plus/prefer-vite-plus-imports": "error",
        },
        overrides: [
            {
                files: ["tests/**"],
                plugins: ["vitest"],
                rules: {
                    "vitest/require-to-throw-message": "off",
                    "vitest/no-conditional-expect": "warn",
                    "vitest/expect-expect": "warn",
                    "vitest/require-mock-type-parameters": "off",
                },
            },
        ],
        ignorePatterns: [".next/**", "out/**", "build/**", "next-env.d.ts"],
        options: {
            typeAware: true,
            typeCheck: true,
        },
        jsPlugins: [
            {
                name: "vite-plus",
                specifier: "vite-plus/oxlint-plugin",
            },
        ],
    },
});
