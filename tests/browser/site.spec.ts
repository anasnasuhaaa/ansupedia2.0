import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('public routes preserve SEO, content and authorization boundaries', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Anas Nasuha/ })).toBeVisible();
  await expect(page.locator('.project-card')).toHaveCount(6);
  await expect(page.locator('.profile')).toHaveCount(0);
  expect(await page.locator('link[rel=canonical]').getAttribute('href')).toBeTruthy();
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain(
    'Person',
  );
  for (const path of ['/blog', '/rss.xml', '/sitemap.xml', '/robots.txt', '/admin/login'])
    expect((await request.get(path)).status()).toBe(200);
  expect((await request.get('/blog/missing-fixture')).status()).toBe(404);
  expect((await request.post('/api/admin/posts', { data: {} })).status()).toBe(401);
  expect((await request.get('/admin', { maxRedirects: 0 })).status()).toBe(302);
  expect((await request.post('/api/auth/sign-up/email', { data: {} })).status()).toBe(404);
  expect(errors).toEqual([]);
});

for (const width of [1440, 1280, 1024, 768, 390, 375, 320])
  test(`shared container alignment and mobile navigation at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.addStyleTag({ content: 'astro-dev-toolbar {display:none}' });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => {
      const selectors = ['.header-inner', '.portfolio', '.footer-inner'];
      return selectors.map((selector) => {
        const element = document.querySelector(selector)!;
        const rect = element.getBoundingClientRect();
        const css = getComputedStyle(element);
        return {
          left: rect.left + parseFloat(css.paddingLeft),
          right: rect.right - parseFloat(css.paddingRight),
        };
      });
    });
    for (const frame of metrics) {
      expect(Math.abs(frame.left - metrics[0].left)).toBeLessThan(1);
      expect(Math.abs(frame.right - metrics[0].right)).toBeLessThan(1);
    }
    expect(
      await page
        .locator('.project-grid')
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
    ).toBe(width >= 1280 ? 4 : width >= 768 ? 3 : 2);
    await expect(page.getByText("Hello, I'm Anas")).toHaveCount(0);
    await expect(page.locator('.hero-heading .avatar')).toBeVisible();
    const hero = await page.locator('.hero').boundingBox();
    const projects = await page.locator('.project-grid').boundingBox();
    expect(Math.abs(hero!.x - projects!.x)).toBeLessThan(1);
    expect(Math.abs(hero!.width - projects!.width)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width <= 768) {
      const trigger = page.getByRole('button', { name: 'Open navigation' });
      await trigger.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page
        .getByRole('navigation', { name: 'Mobile navigation' })
        .getByRole('link', { name: 'Projects', exact: true })
        .click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page).toHaveURL(/#projects$/);
      await expect(page.locator('.mobile-nav-link[href="/#projects"]')).toHaveAttribute(
        'aria-current',
        'location',
      );
    }
    await page.goto('/');
    await page.addStyleTag({ content: 'astro-dev-toolbar {display:none}' });
    if (width === 1440 || width === 390) {
      await page.screenshot({
        path: testInfo.outputPath(`home-${width}-light.png`),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Color theme', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Dark', exact: true }).click();
      await expect(page.locator('html')).toHaveClass(/dark/);
      await page.screenshot({
        path: testInfo.outputPath(`home-${width}-dark.png`),
        fullPage: true,
      });
    }
  });

test('theme preference persists across routes and follows the system setting', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Color theme', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  for (const path of ['/blog', '/admin/login', '/']) {
    await page.goto(path);
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  }
  await page.getByRole('button', { name: 'Color theme', exact: true }).click();
  await page.getByRole('menuitem', { name: 'System', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('public accessibility in both themes, navigation and appearance menus', async ({ page }) => {
  await page.goto('/');
  for (const mode of ['Light', 'Dark']) {
    await page.getByRole('button', { name: 'Color theme', exact: true }).click();
    await page.getByRole('menuitem', { name: mode, exact: true }).click();
    expect(
      (
        await new AxeBuilder({ page })
          .exclude('astro-dev-toolbar')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await page.getByRole('button', { name: 'Color theme', exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .exclude('astro-dev-toolbar')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .exclude('astro-dev-toolbar')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test('login attempts remain rate limited', async ({ request }) => {
  let limited = false;
  for (let i = 0; i < 6; i++) {
    const response = await request.post('/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:4321' },
      data: { email: 'nonexistent@example.invalid', password: 'not-a-real-password-123' },
    });
    if (response.status() === 429) limited = true;
    else expect(response.status()).toBe(401);
  }
  expect(limited).toBe(true);
});
