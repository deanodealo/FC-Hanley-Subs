import { test, expect } from '@playwright/test';

test('Find a Team navigation works', async ({ page }) => {

  // 1️⃣ Go to homepage
  await page.goto('https://fchanley.com');

  // 2️⃣ Ignore Facebook iframe (prevents cross-origin errors)
  await page.route('**facebook.com**', route => route.fulfill({ status: 200, body: '' }));

  // 3️⃣ Open slide menu via JS (robust)
  await page.evaluate(() => {
    const burger = document.querySelector('#burger-dropdown');
    if (!burger.classList.contains('open')) {
      burger.classList.add('open');  // force menu open
    }
  });

  // 4️⃣ Click "Find a Team"
  const findTeamLink = page.locator('text=Find a Team');
  await findTeamLink.waitFor({ state: 'visible' });
  await findTeamLink.click();

  // 5️⃣ Verify correct page loads
  await expect(page).toHaveURL('https://fchanley.com/vacancies/playon/index.html');
  await expect(page.locator('h1')).toContainText('Players'); // matches actual content

  // 6️⃣ Click FC Hanley logo to return home
  const logoLink = page.locator('a.hanley-logo-link');
  await logoLink.scrollIntoViewIfNeeded();
  await logoLink.click();

  // 7️⃣ Confirm return to homepage
  await expect(page).toHaveURL('https://fchanley.com');

});