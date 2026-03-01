import { test, expect } from '@playwright/test';

test.describe('[mod:gyms]', () => {
  test('gyms page shows search and submit controls', async ({ page }) => {
    await page.goto('/gyms');
    await expect(page.getByTestId('page:gyms:search')).toBeVisible();
    await expect(page.getByTestId('page:gyms:submit-gym')).toBeVisible();
  });
});
