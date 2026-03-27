import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import {
    createTestOrder,
    updateOrderStatus,
    cleanupTestData,
} from "./utils/firebase-helper.js";
import { loadTestEnv } from "./utils/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = loadTestEnv();

const TEST_RUN_ID = `dup_${Date.now()}`;

const ORDER_A = `${TEST_RUN_ID}_order_a`;
const ORDER_B = `${TEST_RUN_ID}_order_b`;
const ORDER_C = `${TEST_RUN_ID}_order_c`;
const ORDER_D = `${TEST_RUN_ID}_order_d`;

const TEST_ADMIN_EMAIL = env.TEST_ADMIN_EMAIL;
const TEST_ADMIN_PASSWORD = env.TEST_ADMIN_PASSWORD;

const RESTAURANT_ID = "test_restaurant";

const ITEM = {
    id: `${TEST_RUN_ID}_item`,
    name: "Test Item",
    price: 100,
    description: "Test item for duplicate order tests",
    isVeg: true,
    isVisible: true,
    category: "Test",
    image: "",
};

async function loginAsAdmin(page) {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() =>
        window.location.pathname.startsWith('/admin'),
        { timeout: 15_000 }
    );

    const campusPU = page.locator('text="PU"').first();
    if (await campusPU.isVisible({ timeout: 3000 }).catch(() => false)) {
        await campusPU.click();
    }

    await expect(page.locator('h2:has-text("Orders")')).toBeVisible({ timeout: 10_000 });
}

test.describe("Duplicate Order Detection - Two Duplicates", () => {
    test.beforeAll(async () => {
        await createTestOrder(ORDER_A, {
            name: "Test User A",
            phone: "9999990001",
            campus: "Test Campus",
            address: "Test Hostel",
            items: [{
                id: ITEM.id,
                name: ITEM.name,
                quantity: 1,
                restaurantId: RESTAURANT_ID,
                restaurantName: "Test Restaurant",
            }],
            restaurantIds: [RESTAURANT_ID],
            status: "placed",
            finalTotal: 100,
        });

        await new Promise(r => setTimeout(r, 2000));

        await createTestOrder(ORDER_B, {
            name: "Test User B",
            phone: "9999990001",
            campus: "Test Campus",
            address: "Test Hostel",
            items: [{
                id: ITEM.id,
                name: ITEM.name,
                quantity: 1,
                restaurantId: RESTAURANT_ID,
                restaurantName: "Test Restaurant",
            }],
            restaurantIds: [RESTAURANT_ID],
            status: "placed",
            finalTotal: 100,
        });
    });

    test.afterAll(async () => {
        await cleanupTestData({
            orderIds: [ORDER_A, ORDER_B],
        });
    });

    test("two pending duplicates show warning banner and are grouped side-by-side", async ({
        page,
    }) => {
        await loginAsAdmin(page);

        await page.waitForTimeout(2000);

        const duplicateBanner1 = page.locator('text=Potential duplicate order').first();
        await expect(duplicateBanner1).toBeVisible({ timeout: 10_000 });

        const duplicateBanner2 = page.locator('text=Potential duplicate order').nth(1);
        await expect(duplicateBanner2).toBeVisible({ timeout: 5_000 });

        const yellowCards = page.locator('.bg-yellow-950\\/20');
        await expect(yellowCards).toHaveCount(2);
    });

    test("cross-tab duplicate shows 'Duplicate already in Progress' when duplicate is in in-progress tab", async ({ page }) => {
        await updateOrderStatus(ORDER_A, "confirmed");

        await loginAsAdmin(page);
        await page.waitForTimeout(3000);

        const crossTabBanner = page.locator('text=Duplicate already in Progress');
        await expect(crossTabBanner).toBeVisible({ timeout: 10_000 });
    });
});

test.describe("Duplicate Order Detection - Three Orders (Duplicate with gap)", () => {
    const ORDER_E = `${TEST_RUN_ID}_order_e`;
    const ORDER_F = `${TEST_RUN_ID}_order_f`;
    const ORDER_G = `${TEST_RUN_ID}_order_g`;

    test.beforeAll(async () => {
        await createTestOrder(ORDER_E, {
            name: "Test User E",
            phone: "9999990004",
            campus: "Test Campus",
            address: "Test Hostel",
            items: [{
                id: ITEM.id,
                name: ITEM.name,
                quantity: 1,
                restaurantId: RESTAURANT_ID,
                restaurantName: "Test Restaurant",
            }],
            restaurantIds: [RESTAURANT_ID],
            status: "placed",
            finalTotal: 100,
        });

        await new Promise(r => setTimeout(r, 2000));

        await createTestOrder(ORDER_F, {
            name: "Test User F",
            phone: "9999990005",
            campus: "Test Campus",
            address: "Test Hostel",
            items: [{
                id: ITEM.id,
                name: ITEM.name,
                quantity: 1,
                restaurantId: RESTAURANT_ID,
                restaurantName: "Test Restaurant",
            }],
            restaurantIds: [RESTAURANT_ID],
            status: "placed",
            finalTotal: 100,
        });

        await new Promise(r => setTimeout(r, 2000));

        await createTestOrder(ORDER_G, {
            name: "Test User G",
            phone: "9999990004",
            campus: "Test Campus",
            address: "Test Hostel",
            items: [{
                id: ITEM.id,
                name: ITEM.name,
                quantity: 1,
                restaurantId: RESTAURANT_ID,
                restaurantName: "Test Restaurant",
            }],
            restaurantIds: [RESTAURANT_ID],
            status: "placed",
            finalTotal: 100,
        });
    });

    test.afterAll(async () => {
        await cleanupTestData({
            orderIds: [ORDER_E, ORDER_F, ORDER_G],
        });
    });

    test("duplicate with non-duplicate in between gets sorted side-by-side", async ({ page }) => {
        await loginAsAdmin(page);

        await page.waitForTimeout(2000);

        const yellowCards = page.locator('.bg-yellow-950\\/20');
        await expect(yellowCards).toHaveCount(2);
    });
});
