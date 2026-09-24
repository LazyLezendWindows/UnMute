import { test, expect, request } from '@playwright/test';

const PASSWORD = 'Password123!';

// engine.io drops its connection on the browser's offline event everywhere except on "localhost".
test.use({ baseURL: 'http://127.0.0.1:5174' });

test('live chat: notification badge elsewhere, live delivery, and catch-up after going offline', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();

  // Two members who have matched: Kiran uses the browser, Devi is driven through the API.
  const kiranApi = await request.newContext({ baseURL });
  const kiranEmail = `kiran.${stamp}@example.com`;
  const kiran = (await (await kiranApi.post('/api/v1/auth/register', { data: { email: kiranEmail, password: PASSWORD, displayName: 'Kiran', dateOfBirth: '1997-01-01' } })).json()).data.user.id;
  const devi = await request.newContext({ baseURL });
  const deviId = (await (await devi.post('/api/v1/auth/register', { data: { email: `devi.${stamp}@example.com`, password: PASSWORD, displayName: 'Devi', dateOfBirth: '1997-01-01' } })).json()).data.user.id;
  await kiranApi.post('/api/v1/interactions/like', { data: { targetUserId: deviId } });
  const conversationId = (await (await devi.post('/api/v1/interactions/like', { data: { targetUserId: kiran } })).json()).data.conversationId;
  const say = (content: string) => devi.post(`/api/v1/conversations/${conversationId}/messages`, { data: { content } });

  // Count realtime connections so the test proves a real drop and reconnect happened.
  const sockets: { closed: boolean }[] = [];
  page.on('websocket', (ws) => {
    if (!ws.url().includes('/socket.io/')) return;
    const entry = { closed: false };
    sockets.push(entry);
    ws.on('close', () => (entry.closed = true));
  });

  await page.goto('/login');
  await page.getByLabel('Email address').fill(kiranEmail);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);

  // Not in chat: the unread badge and a notification still appear.
  await page.goto('/settings');
  await page.waitForTimeout(500); // let the realtime connection settle
  await say('hi from Devi');
  await expect(page.getByText('New message from Devi')).toBeVisible();
  await expect(page.locator('.nav-badge').first()).toHaveText('1');

  // In the chat: history plus live delivery.
  await page.goto(`/chat/${conversationId}`);
  const bubbles = page.locator('.chat-bubble');
  await expect(bubbles.filter({ hasText: 'hi from Devi' })).toBeVisible();
  await say('are you there?');
  await expect(bubbles.filter({ hasText: 'are you there?' })).toBeVisible();

  // Offline: messages sent meanwhile arrive once the connection comes back, exactly once.
  const before = sockets.length;
  await page.context().setOffline(true);
  // Chrome's offline emulation keeps open WebSockets alive; the browser's offline event is what
  // makes the realtime client drop its connection, as it does on a real network loss.
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect.poll(() => sockets.every((s) => s.closed)).toBe(true);
  await say('sent while you were offline');
  await page.context().setOffline(false);
  await expect.poll(() => sockets.length, { timeout: 60_000 }).toBeGreaterThan(before);
  const offlineMessage = bubbles.filter({ hasText: 'sent while you were offline' });
  await expect(offlineMessage).toBeVisible({ timeout: 90_000 });
  await expect(offlineMessage).toHaveCount(1);
  await expect(bubbles.filter({ hasText: 'are you there?' })).toHaveCount(1);
});
