import { test, expect, localDatabase } from './fixtures';
test.beforeEach(async ({ context, editorial }) => {
  test.skip(!localDatabase || !editorial, 'Uses only a localhost database.');
  await context.addCookies(editorial!.state.cookies);
});

test('Sonner is shared, follows the theme and shows only validated one-time redirect messages', async ({
  page,
}) => {
  await page.goto('/admin?notice=saved');
  await expect(page.getByRole('region', { name: /^Notifications/ })).toHaveCount(1);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  for (const value of [
    '{invalid',
    JSON.stringify({
      code: '<script>alert(1)</script>',
      path: '/admin',
      expires: Date.now() + 10000,
    }),
    JSON.stringify({ code: 'signedIn', path: '/admin', expires: Date.now() - 1000 }),
    JSON.stringify({ code: 'signedIn', path: '/admin/posts', expires: Date.now() + 10000 }),
  ]) {
    await page.evaluate((value) => sessionStorage.setItem('ansupedia:notification', value), value);
    await page.reload();
    await expect(page.getByRole('region', { name: /^Notifications/ })).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('ansupedia:notification')))
      .toBeNull();
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  }
  await page.evaluate(() =>
    sessionStorage.setItem(
      'ansupedia:notification',
      JSON.stringify({ code: 'draftSaved', path: '/admin', expires: Date.now() + 30000 }),
    ),
  );
  await page.reload();
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(1);
  await expect(page.locator('[data-sonner-toast]')).toContainText('Draft saved.');
  await page.getByRole('button', { name: 'Color theme', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Dark', exact: true }).click();
  await expect(page.locator('[data-sonner-toaster]')).toHaveAttribute('data-sonner-theme', 'dark');
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.locator('[data-sonner-toaster]')).toHaveAttribute('data-x-position', 'center');
  await expect(page.locator('[data-sonner-toast]')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: /^Notifications/ })).toHaveCount(1);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
});

test('login and logout display confirmed success after navigation, and failed login shows an error', async ({
  page,
  context,
  editorial,
}) => {
  test.setTimeout(90000);
  await context.clearCookies();
  await page.goto('/admin/login');
  await page.route('**/api/auth/sign-in/email', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: '{"error":"Invalid credentials"}',
    }),
  );
  await page.getByLabel('Email', { exact: true }).fill(editorial!.credentials.email);
  await page.getByLabel('Password', { exact: true }).fill('invalid-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('[data-sonner-toast]')).toContainText('Sign-in failed.');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.unroute('**/api/auth/sign-in/email');
  await page.getByLabel('Password', { exact: true }).fill(editorial!.credentials.password);
  const result = page.waitForResponse('**/api/auth/sign-in/email');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const response = await result;
  if (response.status() === 429) {
    // Respect the shared localhost IP's cooldown after earlier verification runs.
    const seconds = Math.min(60, Number(response.headers()['retry-after']) || 60) + 1;
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(1);
  await expect(page.locator('[data-sonner-toast]')).toContainText('Signed in successfully.');
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(1);
  await expect(page.locator('[data-sonner-toast]')).toContainText('Signed out successfully.');
  await page.reload();
  await expect(page.getByRole('region', { name: /^Notifications/ })).toHaveCount(1);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
});
