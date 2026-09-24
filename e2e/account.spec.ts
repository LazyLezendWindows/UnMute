import { test, expect, request } from '@playwright/test';

const PASSWORD = 'Password123!';
const SHOTS = process.env.E2E_SCREENSHOT_DIR;

test('export data, then permanently delete the account from Settings', async ({ page, baseURL }) => {
  const email = `leaver.${Date.now()}@example.com`;
  const api = await request.newContext({ baseURL });
  await api.post('/api/v1/auth/register', { data: { email, password: PASSWORD, displayName: 'Leaver', dateOfBirth: '1996-01-01' } });

  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/settings');

  // Download my data
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download my data/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('unmute-data-export.json');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/settings-account.png`, fullPage: true });

  // Delete: only possible after typing DELETE
  await page.getByRole('button', { name: /Delete account Permanently/ }).click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Delete account' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/settings-delete-modal.png` });
  await confirm.click();
  await expect(page).toHaveURL(/\/login/);

  // The account is gone: signing in fails
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid email or password')).toBeVisible();
});
