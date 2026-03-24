import { chromium } from "@playwright/test";
import path from "path";
import { loadTestEnv } from "./utils/env.js";
import { initFirebaseAdmin } from "./utils/firebase-helper.js";

const FIXTURES_DIR = path.resolve(process.cwd(), "tests/fixtures/auth");

export default async function globalSetup() {
    const env = loadTestEnv();

    // Initialize Firebase Admin (also runs safety guard)
    initFirebaseAdmin();

    // Authenticate roles via browser
    const browser = await chromium.launch();

    // --- Admin session ---
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await adminPage.goto("http://localhost:3005/admin/login");
    await adminPage.fill('input[type="email"]', env.TEST_ADMIN_EMAIL);
    await adminPage.fill('input[type="password"]', env.TEST_ADMIN_PASSWORD);
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL("**/admin", { timeout: 15_000 });
    await adminContext.storageState({ path: path.join(FIXTURES_DIR, "admin.json") });
    await adminContext.close();

    // --- Partner session ---
    const partnerContext = await browser.newContext();
    const partnerPage = await partnerContext.newPage();
    await partnerPage.goto("http://localhost:3005/partner/login");
    await partnerPage.fill('input[type="email"]', env.TEST_PARTNER_EMAIL);
    await partnerPage.fill('input[type="password"]', env.TEST_PARTNER_PASSWORD);
    await partnerPage.click('button[type="submit"]');
    await partnerPage.waitForURL("**/partner", { timeout: 15_000 });
    await partnerContext.storageState({ path: path.join(FIXTURES_DIR, "partner.json") });
    await partnerContext.close();

    await browser.close();

    console.log("✅ Global setup complete — admin and partner sessions saved.");
}
