import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3005/');
  await page.getByRole('link', { name: 'Food Live Food. Craving' }).click();
  await page.getByRole('button', { name: 'P PU' }).click();
  await page.getByRole('link', { name: 'mins DASD Menu View Menu →' }).first().click();
  await page.locator('#menu-item-sds').getByRole('button', { name: 'ADD' }).click();
  await expect(page.getByText('ITEMS ADDED₹232 + taxesView Cart')).toBeVisible();
  await expect(page.getByRole('main')).toContainText('View Cart');
  await page.getByText('View Cart').click();
  await page.getByRole('textbox', { name: 'Your Name' }).click();
  await page.getByRole('textbox', { name: 'Your Name' }).fill('test');
  await page.getByRole('textbox', { name: 'Phone Number' }).click();
  await page.getByRole('textbox', { name: 'Phone Number' }).fill('0000000000');
  await page.getByRole('textbox', { name: 'Hostel' }).click();
  await page.getByRole('textbox', { name: 'Hostel' }).fill('test');
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Place Order via WhatsApp' }).click();
  await page.goto('http://localhost:3005/admin/login/');
  await page.getByRole('textbox', { name: 'admin@example.com' }).click();
  await page.getByRole('textbox', { name: 'admin@example.com' }).fill('testadmin@pumato.online');
  await page.getByRole('textbox', { name: '••••••••' }).click();
  await page.getByRole('textbox', { name: '••••••••' }).fill('testadminpass');
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('placed').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('Confirm Order');
  await page.getByRole('button', { name: 'Confirm Order' }).first().click();
  await page.getByRole('button', { name: 'In Progress' }).click();
  await expect(page.locator('body')).toContainText('Confirmed');
});
