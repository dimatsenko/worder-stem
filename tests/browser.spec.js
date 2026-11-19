import { test, expect } from '@playwright/test';
async function start(page) {
  await page.goto('/app.html');
  await expect(page.locator('[data-action="start"]')).toBeVisible();
  await expect(page.locator('#web-app')).not.toContainText('Готуємо твої колоди');
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('.study-card')).toBeVisible();
}
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('worder.web.v1')));
test('Vue screen, flip, grading, undo, reload, modal cancel/apply and navigation', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  const before = await saved(page);
  const original = await page.locator('.study-word').innerText();
  await page.locator('button[data-action="flip"]').click();
  await expect(page.locator('.study-word')).not.toHaveText(original);
  await page.waitForTimeout(350);
  await page.locator('[data-action="right"]').click();
  await page.waitForTimeout(400);
  expect((await saved(page)).session.index).toBeGreaterThan(before.session.index);
  await page.locator('[data-action="undo"]').click();
  expect((await saved(page)).session).toEqual(before.session);
  await page.reload();
  await expect(page.locator('.study-card')).toBeVisible();
  expect((await saved(page)).session).toEqual(before.session);
  await page.locator('[data-action="settings"]').click();
  await page.locator('#study-settings-dialog [data-level="a2"]').click();
  await page.locator('[data-action="close-settings"]').click();
  expect((await saved(page)).selected).toEqual(['a1']);
  await page.locator('[data-action="settings"]').click();
  await expect(page.locator('#study-settings-dialog [data-level="a2"]')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.locator('#study-settings-dialog [data-level="a2"]').click();
  await page.locator('[data-action="apply-settings"]').click();
  expect((await saved(page)).selected).toEqual(['a1', 'a2']);
  await page.locator('[data-action="mode"]').click();
  await page.locator('[data-mode="review"]').click();
  await expect(page.locator('.study-finished')).toBeVisible();
  await page.locator('[data-action="learn"]').click();
  await expect(page.locator('.study-card')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.level-screen')).toBeVisible();
  await page.goForward();
  await expect(page.locator('.study-card')).toBeVisible();
  expect(errors).toEqual([]);
});
test('quiz and repeat clicks do not duplicate accepted answers', async ({ page }) => {
  await start(page);
  for (let i = 0; i < 10; i++) {
    if (await page.locator('.quiz-option').count()) break;
    await page.locator('[data-action="right"]').click();
    await page.waitForTimeout(400);
  }
  await expect(page.locator('.quiz-option')).toHaveCount(4);
  await page.locator('.quiz-option').first().click();
  await expect(page.locator('.answer-feedback')).toBeVisible();
  await page.waitForTimeout(350);
  const before = (await saved(page)).session.index;
  await page.locator('[data-action="right"]').dispatchEvent('click');
  await page.locator('[data-action="right"]').dispatchEvent('click');
  await page.waitForTimeout(400);
  expect((await saved(page)).session.index).toBe(before + 1);
});
for (const width of [390, 1440])
  test(`layout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await start(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/vue-study-${width}.png` });
  });
