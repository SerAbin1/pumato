import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import {
    createTestRestaurant,
    createTestOrder,
    updateOrderStatus,
    getRestaurantDoc,
    getOrderDoc,
    cleanupTestData,
} from "./utils/firebase-helper.js";
import { loadTestEnv } from "./utils/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = loadTestEnv();

// --- Test Data ---
const TEST_RUN_ID = `test_${Date.now()}`;
const RESTAURANT_ID = env.TEST_PARTNER_RESTAURANT_ID;
const ORDER_ID = `${TEST_RUN_ID}_order`;

const ITEM_A = {
    id: `${TEST_RUN_ID}_item_a`,
    name: "Test Burger",
    price: 150,
    description: "Test item A",
    isVeg: false,
    isVisible: true,
    category: "Test",
    image: "",
};

const ITEM_B = {
    id: `${TEST_RUN_ID}_item_b`,
    name: "Test Fries",
    price: 80,
    description: "Test item B",
    isVeg: true,
    isVisible: true,
    category: "Test",
    image: "",
};

test.describe("OOS Rejection Flow", () => {
    // Setup: create test restaurant and order directly in Firestore
    test.beforeAll(async () => {
        // Create restaurant with 2 menu items (both visible)
        await createTestRestaurant(RESTAURANT_ID, {
            name: `Test Restaurant ${TEST_RUN_ID}`,
            isVisible: true,
            menu: [ITEM_A, ITEM_B],
        });

        // Create order referencing both items, status "placed"
        await createTestOrder(ORDER_ID, {
            name: "Test User",
            phone: "9999999999",
            campus: "Test Campus",
            address: "Test Hostel",
            items: [
                {
                    id: ITEM_A.id,
                    name: ITEM_A.name,
                    quantity: 1,
                    restaurantId: RESTAURANT_ID,
                    restaurantName: `Test Restaurant ${TEST_RUN_ID}`,
                },
                {
                    id: ITEM_B.id,
                    name: ITEM_B.name,
                    quantity: 1,
                    restaurantId: RESTAURANT_ID,
                    restaurantName: `Test Restaurant ${TEST_RUN_ID}`,
                },
            ],
            restaurantIds: [RESTAURANT_ID],
            status: "placed",
            finalTotal: 230,
        });

        // Admin confirms the order
        await updateOrderStatus(ORDER_ID, "confirmed");
    });

    // Cleanup: delete test data after all tests
    test.afterAll(async () => {
        await cleanupTestData({
            restaurantId: RESTAURANT_ID,
            orderId: ORDER_ID,
        });
    });

    test("partner rejects order with OOS — selected item marked invisible, other unchanged", async ({
        browser,
    }) => {
        // Use saved partner session
        const partnerContext = await browser.newContext({
            storageState: path.resolve(
                __dirname,
                "../fixtures/auth/partner.json"
            ),
        });
        const page = await partnerContext.newPage();

        // Navigate to partner dashboard
        await page.goto("/partner");
        await page.waitForLoadState("networkidle");

        // Wait for the confirmed order to appear in the live orders tab
        // The order card should show our test items
        const orderCard = page.locator(
            `text=${ITEM_A.name}`
        ).first();
        await expect(orderCard).toBeVisible({ timeout: 15_000 });

        // Click the "Out of Stock" button to open OOS picker
        const oosButton = page.locator('[data-testid="oos-button"]').first();
        await expect(oosButton).toBeVisible({ timeout: 5_000 });
        await oosButton.click();

        // Wait for OOS picker to appear
        const oosPicker = page.locator(
            'text=Select unavailable items'
        );
        await expect(oosPicker).toBeVisible({ timeout: 5_000 });

        // Select ONLY item A as out of stock
        const itemACheckbox = page.locator(
            `[data-testid="oos-item-checkbox-${ITEM_A.id}"]`
        );
        await expect(itemACheckbox).toBeVisible({ timeout: 5_000 });
        await itemACheckbox.click();

        // Confirm OOS
        const confirmBtn = page.locator('[data-testid="confirm-oos"]');
        await expect(confirmBtn).toBeEnabled({ timeout: 5_000 });
        await confirmBtn.click();

        // Wait for the action to complete (toast or status change)
        // Give Firestore time to propagate the update
        await page.waitForTimeout(3_000);

        // === ASSERTIONS (via Firebase Admin — check actual Firestore state) ===

        // 1. Check order document
        const orderDoc = await getOrderDoc(ORDER_ID);
        expect(orderDoc, "Order document should exist after OOS action").toBeTruthy();

        expect(orderDoc.status).toBe("out_of_stock");
        expect(
            orderDoc.outOfStockItems,
            "Order should have outOfStockItems array"
        ).toBeDefined();
        expect(orderDoc.outOfStockItems).toContain(ITEM_A.id);
        expect(
            orderDoc.outOfStockItems,
            "Only selected item should be in outOfStockItems"
        ).not.toContain(ITEM_B.id);

        // 2. Check restaurant document — menu state
        const restaurantDoc = await getRestaurantDoc(RESTAURANT_ID);
        expect(
            restaurantDoc,
            "Restaurant document should exist after OOS action"
        ).toBeTruthy();

        const menu = restaurantDoc.menu;
        expect(menu, "Restaurant should have a menu array").toBeDefined();
        expect(menu.length).toBeGreaterThanOrEqual(2);

        const updatedItemA = menu.find((item) => item.id === ITEM_A.id);
        const updatedItemB = menu.find((item) => item.id === ITEM_B.id);

        expect(
            updatedItemA,
            `Menu should contain item with id "${ITEM_A.id}"`
        ).toBeTruthy();
        expect(
            updatedItemB,
            `Menu should contain item with id "${ITEM_B.id}"`
        ).toBeTruthy();

        // 3. STRICT assertion: selected item MUST be marked OOS
        expect(
            updatedItemA.isVisible,
            `Expected selected item "${ITEM_A.name}" to be marked OOS (isVisible: false), but got isVisible: ${updatedItemA.isVisible}`
        ).toBe(false);
        expect(
            updatedItemA.hiddenAt,
            `Expected selected item "${ITEM_A.name}" to have hiddenAt timestamp, but it was ${updatedItemA.hiddenAt}`
        ).toBeTruthy();

        // Validate hiddenAt is a valid ISO date string
        const parsedDate = new Date(updatedItemA.hiddenAt);
        expect(
            parsedDate.getTime(),
            `hiddenAt "${updatedItemA.hiddenAt}" should be a valid date`
        ).not.toBeNaN();

        // 4. STRICT assertion: non-selected item MUST remain unchanged
        expect(
            updatedItemB.isVisible,
            `Unexpected mutation: non-selected item "${ITEM_B.name}" was modified. Expected isVisible: true, got: ${updatedItemB.isVisible}`
        ).toBe(true);
        expect(
            updatedItemB.hiddenAt,
            `Unexpected mutation: non-selected item "${ITEM_B.name}" has hiddenAt: ${updatedItemB.hiddenAt}, expected it to remain unchanged (undefined/null)`
        ).toBeFalsy();

        await partnerContext.close();
    });
});
