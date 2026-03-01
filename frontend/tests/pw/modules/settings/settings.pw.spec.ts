import { test, expect } from '@playwright/test';

test.describe('[mod:settings]', () => {
  test('settings page shows reset button', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('page:settings:reset')).toBeVisible();
  });
});
