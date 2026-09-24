import { test, expect, request, Browser, Page } from '@playwright/test';

const PASSWORD = 'Password123!';
const SHOTS = process.env.E2E_SCREENSHOT_DIR;

async function register(baseURL: string, email: string, displayName: string) {
  const api = await request.newContext({ baseURL });
  const res = await api.post('/api/v1/auth/register', { data: { email, password: PASSWORD, displayName, dateOfBirth: '1997-04-04' } });
  expect(res.ok()).toBeTruthy();
  return { api, id: (await res.json()).data.user.id as string, email, displayName };
}

/** A signed-in browser session of its own (separate cookies), like a second phone. */
async function signIn(browser: Browser, baseURL: string, email: string, mobile = false): Promise<Page> {
  const context = await browser.newContext({ baseURL, ...(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true } : {}) });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  return page;
}

/** Passes on other people until `name` is the top card on Discover. */
async function findOnDiscover(page: Page, name: string) {
  await page.goto('/discover');
  const card = page.locator('.discover-card-3d').first();
  for (let i = 0; i < 40; i++) {
    await expect(card).toBeVisible();
    if ((await card.textContent())?.includes(name)) return;
    await page.getByRole('button', { name: 'Pass', exact: true }).click();
    await page.waitForTimeout(450); // the card's fling animation
  }
  throw new Error(`${name} never came up on Discover`);
}

test('message request: send from Discover, review, accept, then chat both ways', async ({ browser, baseURL }) => {
  const stamp = Date.now();
  const sender = await register(baseURL!, `tara.${stamp}@example.com`, `Tara${stamp % 10000}`);
  const recipient = await register(baseURL!, `nikhil.${stamp}@example.com`, `Nikhil${stamp % 10000}`);

  // Tara messages Nikhil from Discover: a request, not a chat.
  const tara = await signIn(browser, baseURL!, sender.email);
  await findOnDiscover(tara, recipient.displayName);
  await tara.getByRole('button', { name: `Message ${recipient.displayName}` }).click();
  const dialog = tara.getByRole('dialog');
  await dialog.getByLabel('Your message').fill('Hi! I saw you like astronomy too 🌙');
  if (SHOTS) await tara.screenshot({ path: `${SHOTS}/request-compose.png` });
  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(tara.getByText(`Request sent to ${recipient.displayName}`)).toBeVisible();

  await tara.goto('/chat?tab=requests');
  const sentCard = tara.locator('.request-card', { hasText: recipient.displayName });
  await expect(sentCard).toContainText('Request sent');
  await expect(sentCard).toContainText('You: Hi! I saw you like astronomy too');
  await tara.getByRole('tab', { name: /Chats/ }).click();
  await expect(tara.getByText('No chats yet')).toBeVisible();

  // Nikhil sees the request with a badge, opens it (which does not accept it), and reviews the profile.
  const nikhil = await signIn(browser, baseURL!, recipient.email);
  await nikhil.goto('/chat');
  await expect(nikhil.getByRole('tab', { name: /Requests\s*1/ })).toBeVisible();
  await nikhil.getByRole('tab', { name: /Requests/ }).click();
  const card = nikhil.locator('.request-card', { hasText: sender.displayName });
  await expect(card).toContainText('Hi! I saw you like astronomy too');
  if (SHOTS) await nikhil.screenshot({ path: `${SHOTS}/requests-list.png` });
  await card.getByRole('button', { name: `Open request from ${sender.displayName}` }).click();
  await expect(nikhil.getByText(`${sender.displayName} wants to chat`)).toBeVisible();
  await expect(nikhil.getByLabel(`About ${sender.displayName}`)).toBeVisible();
  if (SHOTS) await nikhil.screenshot({ path: `${SHOTS}/request-detail.png` });
  const stillPending = await (await nikhil.request.get('/api/v1/chat-requests/incoming')).json();
  expect(stillPending.data.map((r: any) => r.otherUser.id)).toContain(sender.id);

  // Accepting opens the chat; the introduction is its first message.
  await nikhil.locator('.chat-view-pane').getByRole('button', { name: 'Accept' }).click();
  await expect(nikhil).toHaveURL(/\/chat\/[0-9a-f-]{36}$/);
  await expect(nikhil.locator('.chat-bubble', { hasText: 'Hi! I saw you like astronomy too' })).toBeVisible();

  // Tara is told in real time, and the chat now works both ways.
  await expect(tara.getByText(`${recipient.displayName} accepted your message request`)).toBeVisible();
  await tara.getByRole('tab', { name: /Chats/ }).click();
  await tara.locator('.chat-conv-item', { hasText: recipient.displayName }).click();
  await nikhil.getByPlaceholder('Type a message...').fill('Hey Tara! Saturn is my favourite.');
  await nikhil.getByPlaceholder('Type a message...').press('Enter');
  await expect(tara.locator('.chat-bubble', { hasText: 'Saturn is my favourite' })).toBeVisible();
  await tara.getByPlaceholder('Type a message...').fill('Mine too!');
  await tara.getByPlaceholder('Type a message...').press('Enter');
  await expect(nikhil.locator('.chat-bubble', { hasText: 'Mine too!' })).toBeVisible();
});

test('message request: deleting is quiet, and the sender cannot get round it', async ({ browser, baseURL }) => {
  const stamp = Date.now();
  const sender = await register(baseURL!, `varun.${stamp}@example.com`, `Varun${stamp % 10000}`);
  const recipient = await register(baseURL!, `isha.${stamp}@example.com`, `Isha${stamp % 10000}`);
  await sender.api.post('/api/v1/chat-requests', { data: { recipientId: recipient.id, content: 'Hello there' } });

  const isha = await signIn(browser, baseURL!, recipient.email, true);
  await isha.goto('/chat?tab=requests');
  const card = isha.locator('.request-card', { hasText: sender.displayName });
  await expect(card).toBeVisible();
  if (SHOTS) {
    await isha.screenshot({ path: `${SHOTS}/requests-mobile.png` });
    await card.getByRole('button', { name: `Open request from ${sender.displayName}` }).click();
    await expect(isha.getByText(`${sender.displayName} wants to chat`)).toBeVisible();
    await isha.screenshot({ path: `${SHOTS}/request-detail-mobile.png` });
    await isha.getByRole('button', { name: 'Back to requests' }).click();
  }
  await card.getByRole('button', { name: 'Delete' }).click();
  await expect(isha.getByText('Request deleted.')).toBeVisible();
  await expect(card).toHaveCount(0);
  await expect(isha.getByText('No message requests')).toBeVisible();

  // Varun still sees "Request sent" and cannot send again or message through it.
  const varun = await signIn(browser, baseURL!, sender.email);
  await varun.goto('/chat?tab=requests');
  await expect(varun.locator('.request-card', { hasText: recipient.displayName })).toContainText('Request sent');
  const retry = await varun.request.post('/api/v1/chat-requests', { data: { recipientId: recipient.id, content: 'Again?' } });
  expect(retry.status()).toBe(409);
  const conversationId = (await retry.json()).data.conversationId;
  const bypass = await varun.request.post(`/api/v1/conversations/${conversationId}/messages`, { data: { content: 'sneaky' } });
  expect(bypass.status()).toBe(403);
  await isha.reload();
  await expect(isha.getByText('No message requests')).toBeVisible();
});
