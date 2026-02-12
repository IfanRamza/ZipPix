import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Accessibility', () => {
  test('home page should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('privacy policy should be accessible', async ({ page }) => {
    await page.goto('/privacy');

    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('terms of service should be accessible', async ({ page }) => {
    await page.goto('/terms');

    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('verify keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Skip to main content or logo
    await expect(page.locator(':focus')).toBeVisible();

    // Ensure upload button is reachable
    const uploadBtn = page.getByRole('button', { name: 'Select Image' });
    await expect(uploadBtn).toBeVisible();
  });
});
