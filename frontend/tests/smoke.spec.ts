import { test, expect } from '@playwright/test';

test('nav calendar link is findable by test id and navigates', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('ui:topnav:nav:calendar').click();
  await expect(page).toHaveURL(/\/calendar/);
});
