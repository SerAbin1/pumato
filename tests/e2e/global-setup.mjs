import { chromium } from "@playwright/test";
import path from "path";
import { loadTestEnv } from "./utils/env.mjs";
import { initFirebaseAdmin } from "./utils/firebase-helper.mjs";

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
    try {
        // Wait for either the admin dashboard URL or the campus selector modal
        await adminPage.waitForFunction(() => 
            window.location.pathname.includes('/admin') || 
            document.body.innerText.includes('Choose Your Campus'), 
            { timeout: 15_000 }
        );
        
        // Help the session along if we're on the dashboard but the modal is blocking
        const campusPU = adminPage.locator('text="PU"').first();
        if (await campusPU.isVisible({ timeout: 3000 }).catch(() => false)) {
            await campusPU.click();
            await adminPage.waitForLoadState('networkidle');
        }

        // Final URL check to ensure we settled
        if (!adminPage.url().includes('/admin')) {
             await adminPage.waitForURL("**/admin*", { timeout: 5000 });
        }
    } catch (e) {
        const errText = await adminPage.locator('.text-red-400').innerText().catch(() => 'No error text visible');
        console.error(`ADMIN LOGIN FAILED: ${errText}`);
        await adminPage.screenshot({ path: path.join(process.cwd(), 'admin-login-error.png') });
        throw e;
    }
    await adminContext.storageState({ path: path.join(FIXTURES_DIR, "admin.json") });
    await adminContext.close();

    // --- Partner session ---
    const partnerContext = await browser.newContext();
    const partnerPage = await partnerContext.newPage();
    await partnerPage.goto("http://localhost:3005/partner/login");
    await partnerPage.fill('input[type="email"]', env.TEST_PARTNER_EMAIL);
    await partnerPage.fill('input[type="password"]', env.TEST_PARTNER_PASSWORD);
    await partnerPage.click('button[type="submit"]');
    try {
        // Wait for either the partner dashboard URL or the campus selector modal
        await partnerPage.waitForFunction(() => 
            window.location.pathname.includes('/partner') || 
            document.body.innerText.includes('Choose Your Campus'), 
            { timeout: 15_000 }
        );
        
        // Handle optional campus selector if it appears
        const campusPU = partnerPage.locator('text="PU"').first();
        if (await campusPU.isVisible({ timeout: 3000 }).catch(() => false)) {
            await campusPU.click();
            await partnerPage.waitForLoadState('networkidle');
        }

        // Final URL check to ensure we settled
        if (!partnerPage.url().includes('/partner')) {
             await partnerPage.waitForURL("**/partner*", { timeout: 5000 });
        }
    } catch (e) {
        const errText = await partnerPage.locator('.text-red-400').innerText().catch(() => 'No error text visible');
        console.error(`PARTNER LOGIN FAILED: ${errText}`);
        await partnerPage.screenshot({ path: path.join(process.cwd(), 'partner-login-error.png') });
        throw e;
    }
    await partnerContext.storageState({ path: path.join(FIXTURES_DIR, "partner.json") });
    await partnerContext.close();

    await browser.close();

    console.log("✅ Global setup complete — admin and partner sessions saved.");
}
