import { test, expect, request } from '@playwright/test';

const PASSWORD = 'Password123!';
const SHOTS = process.env.E2E_SCREENSHOT_DIR;

async function member(baseURL: string, email: string, displayName: string) {
  const api = await request.newContext({ baseURL });
  const res = await api.post('/api/v1/auth/register', { data: { email, password: PASSWORD, displayName, dateOfBirth: '1997-04-04' } });
  expect(res.ok()).toBeTruthy();
  return api;
}

test('filter discovery by shared interests', async ({ page, baseURL }) => {
  const stamp = Date.now();
  const tara = await member(baseURL!, `tara.${stamp}@example.com`, `Tara${stamp % 1000}`);
  const interests = (await (await tara.get('/api/v1/users/interests')).json()).data as { id: string; name: string }[];
  const [taraInterest, otherInterest] = interests;
  await tara.patch('/api/v1/users/me', { data: { interestIds: [taraInterest.id] } });

  const viewerEmail = `viewer.${stamp}@example.com`;
  await member(baseURL!, viewerEmail, 'Viewer');
  await page.goto('/login');
  await page.getByLabel('Email address').fill(viewerEmail);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/discover');

  // Only people who share the chosen interest; Tara does not share the other one.
  await page.getByRole('button', { name: /^Filters/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: otherInterest.name, exact: true }).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/discover-interest-filter.png` });
  await dialog.getByRole('button', { name: 'Show people' }).click();
  await expect(page.getByRole('button', { name: 'Remove filter: 1 interest' })).toBeVisible();
  await expect(page.locator('.discover-card-3d', { hasText: `Tara${stamp % 1000}` })).toHaveCount(0);

  await page.getByRole('button', { name: /^Filters/ }).click();
  await dialog.getByRole('button', { name: otherInterest.name, exact: true }).click(); // deselect
  await dialog.getByRole('button', { name: taraInterest.name, exact: true }).click();
  await dialog.getByRole('button', { name: 'Show people' }).click();

  // Everyone shown shares Tara's interest, and she is among them (possibly behind other cards).
  const feed = await (await page.request.get('/api/v1/discover', { params: { interestIds: taraInterest.id, limit: 50 } })).json();
  expect(feed.data.some((c: any) => c.displayName === `Tara${stamp % 1000}`)).toBe(true);
  expect(feed.data.every((c: any) => c.interests.some((i: any) => i.id === taraInterest.id))).toBe(true);
  await expect(page.locator('.discover-card-3d').first()).toBeVisible();

  await page.getByRole('button', { name: 'Remove filter: 1 interest' }).click();
  await expect(page.getByRole('button', { name: /^Filters$/ })).toBeVisible();
});
