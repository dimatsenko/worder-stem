import { test, expect } from '@playwright/test';

// Baselines were captured before the refactor on macOS/Chromium at the same sizes.
// Other operating systems rasterize fonts differently; compare on macOS.
test.use({ reducedMotion: 'reduce' });
for (const width of [390, 1440]) {
  test(`existing appearance at ${width}px`, async ({ page }) => {
    test.skip(process.platform !== 'darwin', 'Visual baselines use macOS fonts.');
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      Math.random = () => 0.42;
    });
    await page.goto('/app.html');
    await expect(page.locator('[data-action="start"]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`app-${width}.png`, {
      fullPage: true,
      maxDiffPixels: 0,
      threshold: 0,
    });
    await page.locator('[data-action="start"]').click();
    await expect(page.locator('.study-card')).toBeVisible();
    await expect(page).toHaveScreenshot(`study-${width}.png`, {
      fullPage: true,
      maxDiffPixels: 0,
      threshold: 0,
    });
    await page.locator('[data-action="settings"]').click();
    await expect(page).toHaveScreenshot(`settings-${width}.png`, {
      fullPage: true,
      maxDiffPixels: 0,
      threshold: 0,
    });
  });
}
