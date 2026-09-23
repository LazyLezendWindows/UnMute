import { test, expect, request, APIRequestContext } from '@playwright/test';

const PASSWORD = 'Password123!';

/** A second member created straight through the API (same backend, via the Vite proxy). */
async function memberViaApi(baseURL: string, email: string, displayName: string, placeQuery: string) {
  const api: APIRequestContext = await request.newContext({ baseURL });
  const reg = await api.post('/api/v1/auth/register', { data: { email, password: PASSWORD, displayName, dateOfBirth: '1997-04-04' } });
  expect(reg.ok()).toBeTruthy();
  const id = (await reg.json()).data.user.id as string;
  const places = await (await api.get('/api/v1/locations/search', { params: { q: placeQuery, kinds: 'city' } })).json();
  const loc = await api.put('/api/v1/users/me/location', { data: { mode: 'place', placeId: places.data[0].id } });
  expect(loc.ok()).toBeTruthy();
  return { api, id };
}

test('signed-out visitors are sent to login and returned afterwards', async ({ page, baseURL }) => {
  const email = `return.${Date.now()}@example.com`;
  const api = await request.newContext({ baseURL });
  await api.post('/api/v1/auth/register', { data: { email, password: PASSWORD, displayName: 'Returner', dateOfBirth: '1996-01-01' } });

  await page.goto('/matches');
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)matches$/);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/matches$/);
});

test('register, set an area, discover someone nearby, filter, and connect', async ({ page, baseURL }) => {
  const stamp = Date.now();
  const other = await memberViaApi(baseURL!, `meera.${stamp}@example.com`, 'Meera', 'Secunderabad');

  // Register through the UI
  await page.goto('/register');
  await page.getByLabel('Preferred Name').fill('Arjun');
  await page.getByLabel('Email address').fill(`arjun.${stamp}@example.com`);
  await page.getByLabel('Date of Birth').fill('1998-05-05');
  await page.getByLabel('Password (min 8 characters)').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/profile$/);

  // Set an area by searching
  const search = page.getByRole('combobox', { name: 'Town, city, village or district' });
  await search.fill('hyder');
  await expect(page.getByRole('option').first()).toContainText('Hyderabad');
  await search.press('Enter');
  await expect(page.locator('.location-current')).toContainText('Hyderabad, Telangana');

  // Discover shows the nearby member with a bucketed distance only
  await page.goto('/discover');
  const card = page.locator('.discover-card-3d');
  await expect(card).toContainText('Meera');
  await expect(card).toContainText('Secunderabad, Telangana · within 10 km');

  // A 5 km radius excludes her (~6 km away); removing the filter brings her back
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByRole('dialog').getByRole('radio', { name: '5 km', exact: true }).click();
  await page.getByRole('button', { name: 'Show people' }).click();
  await expect(page.getByText('No one matches these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Remove filter: Within 5 km' }).click();
  await expect(card).toContainText('Meera');

  // Connect; when she connects back, both see the match
  await page.getByRole('button', { name: 'Connect' }).click();
  const me = await (await page.request.get('/api/v1/auth/me')).json();
  const back = await other.api.post('/api/v1/interactions/like', { data: { targetUserId: me.data.id } });
  expect((await back.json()).data.matched).toBe(true);
  await page.goto('/matches');
  await expect(page.getByText('Meera').first()).toBeVisible();
});
