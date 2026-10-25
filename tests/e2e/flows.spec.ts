import { test, expect } from '@playwright/test';
test('salary → bubbles → allowance → confirmed goal action → refresh', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Salary $3,800 Monthly · paid on the 1st', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Salary $3,800 Monthly · paid on the 1st', exact: true })
    .click();
  await page.getByRole('spinbutton', { name: 'Salary $', exact: true }).fill('4300');
  await page.getByRole('button', { name: 'Save change', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Monthly income $4,700 Every dollar has a direction',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Guilt-free spending $1,500 Yours to enjoy', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Salary $4,300 Monthly · paid on the 1st', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Open FORK AI', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Message FORK AI', exact: true })
    .fill('Save another $200 for my NYC trip.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm change', exact: true })).toBeVisible();
  await expect(page.locator('.proposal')).toContainText('$1,070');
  await expect(page.locator('.proposal')).toContainText('$870');
  await expect(page.locator('.safe-amount')).toContainText('$1,070');
  await page.getByRole('button', { name: 'Confirm change', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Close assistant', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Goal savings $800 3 things to look forward to',
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('.safe-amount')).toContainText('$870');
});
test('CSV import requires review, persists, and skips duplicate rows', async ({ page }) => {
  await page.goto('/x-ray');
  await expect(page.locator('main h1')).toBeVisible();
  for (let i = 0; i < 2; i++) {
    await page.locator('input[type=file]').setInputFiles('public/sample-transactions.csv');
    await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeVisible();
    await expect(page.locator('.review-card tbody tr')).toHaveCount(3);
    await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
    await expect(page.locator('.success-banner')).toContainText(
      i === 0 ? '3 transactions imported' : '0 transactions imported',
    );
  }
  await page.goto('/');
  await expect(page.locator('.safe-amount')).toContainText('$531');
  const response = await page.request.get('/api/finances');
  const body = await response.json();
  expect(
    body.state.transactions.filter((t: { source: string }) => t.source === 'csv'),
  ).toHaveLength(3);
});
test('manual goals support creation, editing, prioritization, and confirmed deletion', async ({
  page,
}) => {
  await page.goto('/goals');
  await page.getByRole('button', { name: 'Create a goal', exact: true }).click();
  await page.getByRole('textbox', { name: 'Goal name', exact: true }).fill('Conference fund');
  await page.getByRole('spinbutton', { name: 'Target amount $', exact: true }).fill('1200');
  await page.getByRole('spinbutton', { name: 'Monthly contribution $', exact: true }).fill('50');
  await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('High');
  await page.getByRole('button', { name: 'Save goal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Conference fund', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Conference fund', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Monthly contribution $', exact: true }).fill('75');
  await page.getByRole('button', { name: 'Save goal', exact: true }).click();
  await page.reload();
  await expect(page.locator('.goal-card').filter({ hasText: 'Conference fund' })).toContainText(
    '$75',
  );
  await page.getByRole('button', { name: 'Delete Conference fund', exact: true }).click();
  await page.getByRole('button', { name: 'Delete goal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Conference fund', exact: true })).toHaveCount(0);
});
test('subscription review persists without fabricating extra allowance', async ({ page }) => {
  await page.goto('/money-leaks');
  await expect(page.locator('main h1')).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Review Netflix', exact: true })
    .selectOption('unnecessary');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Review Netflix', exact: true })).toHaveValue(
    'unnecessary',
  );
  await page.goto('/');
  await expect(page.locator('.safe-amount')).toContainText('$570');
});
test('all seven sections work at desktop and mobile sizes', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/',
      '/cash-flow',
      '/goals',
      '/money-leaks',
      '/x-ray',
      '/simulator',
      '/settings',
    ]) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      if (path === '/') {
        await expect(
          page.getByRole('button', {
            name: 'Monthly income $4,200 Every dollar has a direction',
            exact: true,
          }),
        ).toBeVisible();
        await page.screenshot({ path: `docs/screenshots/overview-${width}.png`, fullPage: true });
        if (width === 1440)
          await page.screenshot({ path: 'docs/screenshots/overview-preview.png', fullPage: false });
      }
      if (width === 1440 && path === '/simulator')
        await page.screenshot({ path: 'docs/screenshots/simulator.png', fullPage: true });
      if (width === 1440 && path === '/cash-flow')
        await page.screenshot({ path: 'docs/screenshots/cash-flow.png', fullPage: true });
    }
  }
});
test('voice configuration failure provides usable typed fallback', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open FORK AI', exact: true }).click();
  await page.getByRole('button', { name: 'Start voice conversation', exact: true }).click();
  await expect(page.locator('.assistant-error')).toContainText('ElevenLabs is not configured');
  await page
    .getByRole('textbox', { name: 'Message FORK AI', exact: true })
    .fill('How much can I safely spend today?');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.locator('.messages')).toContainText('You can safely spend');
});
test('two browser sessions cannot read each other’s records', async ({ browser }) => {
  const alice = await browser.newContext(),
    bob = await browser.newContext();
  const a = await alice.newPage(),
    b = await bob.newPage();
  await a.goto('/');
  await b.goto('/');
  await expect(a.locator('main h1')).toBeVisible();
  await expect(b.locator('main h1')).toBeVisible();
  await a.request.post('/api/finances', {
    headers: { origin: new URL(a.url()).origin },
    data: { version: 0, action: { type: 'settings', name: 'Alice', emergencyMonths: 6 } },
  });
  await b.reload();
  await expect(b.locator('main h1')).toContainText('Alex');
  await a.reload();
  await expect(a.locator('main h1')).toContainText('Alice');
  await alice.close();
  await bob.close();
});
test('assistant history persists between pages and can highlight a cash-flow node', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('main h1')).toBeVisible();
  await page.getByRole('button', { name: 'Open FORK AI', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Message FORK AI', exact: true })
    .fill('Highlight my emergency fund bubble');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.locator('.messages')).toContainText('Open Cash Flow to inspect');
  await page.getByRole('button', { name: 'Close assistant', exact: true }).click();
  await page.getByRole('link', { name: 'Cash Flow', exact: true }).click();
  await expect(page.locator('.flow-bubble.is-highlighted')).toContainText('Emergency fund');
  await page.getByRole('button', { name: 'Open FORK AI', exact: true }).click();
  await expect(page.locator('.messages')).toContainText('Highlight my emergency fund bubble');
});
test('aggregate cash-flow bubbles expose their editable breakdown', async ({ page }) => {
  await page.goto('/cash-flow');
  await page
    .getByRole('button', { name: 'Essentials $2,000 Your everyday foundation', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your essential expenses', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Food & groceries $360', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'Food & groceries $', exact: true }),
  ).toHaveValue('360');
});
