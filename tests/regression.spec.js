import { test, expect } from '@playwright/test';

const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('worder.web.v1')));
async function start(page) {
  await page.goto('/app.html');
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('.study-card')).toBeVisible();
}
async function settled(page) {
  await expect(page.locator('#web-app')).not.toHaveAttribute('aria-busy', 'true');
}

test('daily goal drafts cancel with Escape, apply, and survive reload', async ({ page }) => {
  await start(page);
  const initial = await saved(page);
  await page.locator('[data-action="settings"]').click();
  const slider = page.locator('#study-settings-dialog input');
  await slider.fill('23');
  await page.keyboard.press('Escape');
  await expect(page.locator('#study-settings-dialog')).not.toBeVisible();
  expect((await saved(page)).dailyGoal).toBe(initial.dailyGoal);
  await page.locator('[data-action="settings"]').click();
  await expect(slider).toHaveValue(String(initial.dailyGoal));
  await slider.fill('23');
  await page.locator('[data-action="apply-settings"]').click();
  expect((await saved(page)).session).toEqual(initial.session);
  await page.reload();
  await expect(page.locator('.study-stats')).toContainText('/23');
});

test('keyboard flip and pointer swipe keep grading and undo consistent', async ({ page }) => {
  await start(page);
  const initial = await saved(page);
  const originalWord = await page.locator('.study-word').innerText();
  await page.locator('.card-face').press('Enter');
  await settled(page);
  await expect(page.locator('.study-word')).not.toHaveText(originalWord);
  await page.locator('.card-face').press('Space');
  await settled(page);
  await expect(page.locator('.study-word')).toHaveText(originalWord);
  const card = await page.locator('.study-card').boundingBox();
  const x = card.x + card.width / 2;
  const y = card.y + 45;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 150, y, { steps: 12 });
  await page.mouse.up();
  await settled(page);
  expect((await saved(page)).session.index).toBe(initial.session.index + 1);
  await page.locator('[data-action="undo"]').click();
  expect((await saved(page)).session).toEqual(initial.session);
});

test('another tab updates the session and clears stale undo', async ({ page, context }) => {
  await start(page);
  const second = await context.newPage();
  await second.goto('/app.html#study');
  await expect(second.locator('.study-card')).toBeVisible();
  await page.locator('[data-action="right"]').click();
  await settled(page);
  await expect(second.locator('#app-message')).toHaveText('Прогрес оновлено з іншої вкладки.');
  await expect(second.locator('.study-word')).toHaveText(
    await page.locator('.study-word').innerText(),
  );
  await expect(second.locator('[data-action="undo"]')).toBeDisabled();
});

test('catalog failure shows recovery without overwriting existing progress', async ({ page }) => {
  await start(page);
  const initial = await saved(page);
  await page.route('**/assets/data/english.json', (route) =>
    route.fulfill({ status: 503, body: '' }),
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Не вдалося завантажити колоди' })).toBeVisible();
  expect(await saved(page)).toEqual(initial);
});

test('missing production JavaScript shows the bootstrap recovery message', async ({ page }) => {
  await page.route('**/assets/app-*.js', (route) => route.abort());
  await page.goto('/app.html');
  await expect(page.getByRole('heading', { name: 'Не вдалося запустити навчання' })).toBeVisible();
});

test('navigation during an outgoing card animation does not grade a stale card', async ({
  page,
}) => {
  await start(page);
  const initial = await saved(page);
  await page.locator('[data-action="right"]').dispatchEvent('click');
  await page.goBack();
  await expect(page.locator('.level-screen')).toBeVisible();
  await settled(page);
  expect(await saved(page)).toEqual(initial);
});
