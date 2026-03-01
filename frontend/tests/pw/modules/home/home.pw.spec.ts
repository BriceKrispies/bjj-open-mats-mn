import { test, expect } from '@playwright/test';

test.describe('[mod:home]', () => {
  test('home page loads and shows weekly schedule', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'This Week' })).toBeVisible();
  });
});
