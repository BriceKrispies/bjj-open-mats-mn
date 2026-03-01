import { test, expect } from '@playwright/test';

test.describe('[mod:calendar]', () => {
  test('calendar navigation controls are visible', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page.getByTestId('page:calendar:prev')).toBeVisible();
    await expect(page.getByTestId('page:calendar:today')).toBeVisible();
    await expect(page.getByTestId('page:calendar:next')).toBeVisible();
  });
});
