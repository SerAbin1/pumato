import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 60_000,
    retries: 0,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    reporter: "list",
    globalTeardown: "./tests/e2e/global-teardown.mjs",

    use: {
        baseURL: "http://localhost:3005",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },

    projects: [
        {
            name: "chromium",
            use: {
                browserName: "chromium",
            },
        },
    ],

    webServer: {
        command: "npx dotenv -e .env.test -- pnpm dev -p 3005",
        url: "http://localhost:3005",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});
