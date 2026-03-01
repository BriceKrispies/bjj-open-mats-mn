import { test, expect } from '@playwright/test';

// The dev module provides event-log functionality embedded in /settings.
// There is no dedicated /dev route.
test.describe('[mod:dev]', () => {
  test('event log clear button is accessible from settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('page:settings:clear-log')).toBeVisible();
  });
});
