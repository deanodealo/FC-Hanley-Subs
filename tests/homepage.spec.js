import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('https://fchanley.com');
  await expect(page).toHaveTitle(/FC Hanley/);
});