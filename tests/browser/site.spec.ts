import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

async function settleAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
}

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
      const controlStyle = (element: Element) => {
        const css = getComputedStyle(element);
        const icon = [...element.querySelectorAll('svg')].find(
          (svg) => getComputedStyle(svg).display !== 'none',
        )!;
        return {
          width: css.width,
          height: css.height,
          border: css.borderWidth,
          background: css.backgroundColor,
          icon: getComputedStyle(icon).width,
          stroke: icon.getAttribute('stroke-width'),
        };
      };
      const hamburger = await trigger.evaluate(controlStyle);
      expect(hamburger.border).toBe('0px');
      expect(hamburger).toEqual(
        await page.getByRole('button', { name: 'Color theme', exact: true }).evaluate(controlStyle),
      );
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Menu', exact: true });
      await expect(dialog).toBeVisible();
      const panel = (await dialog.boundingBox())!;
      expect(panel.width).toBeCloseTo(Math.min(280, Math.max(210, width * 0.55)), 2);
      expect(panel.y + panel.height).toBeLessThanOrEqual(900);
      expect(
        await dialog
          .locator('.mobile-nav')
          .evaluate((element) => element.scrollHeight <= element.clientHeight),
      ).toBe(true);
      await expect(dialog.getByRole('navigation').getByRole('link')).toHaveText([
        'About',
        'Projects',
        'Experience',
        'Credentials',
        'Blog',
        'Contact',
      ]);
      await expect(dialog.locator('.mobile-nav svg')).toHaveCount(6);
      await expect(dialog.locator('[data-slot="sheet-footer"]')).toHaveCount(0);
      expect(await dialog.innerText()).not.toContain(
        'Software, security, and the things in between.',
      );
      expect(await dialog.innerText()).not.toContain('Always learning');
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

test('compact navigation keeps focus inside the dialog and closes through the backdrop', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto('/blog');
    await page.addStyleTag({ content: 'astro-dev-toolbar {display:none}' });
    const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Menu', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Blog', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await dialog.getByRole('button', { name: 'Close sheet', exact: true }).focus();
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      );
    }
    await settleAnimations(page);
    await page.screenshot({ path: testInfo.outputPath(`navigation-${theme}.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.mouse.click(10, 120);
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
});

test('theme preference persists across routes and follows the system setting', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Color theme', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  for (const path of ['/blog', '/admin/login', '/']) {
    await page.goto(path);
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  }
  await page.getByRole('button', { name: 'Color theme', exact: true }).click();
  await expect(page.getByRole('menuitem')).toHaveCount(2);
  await expect(page.getByText('Appearance', { exact: true })).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'Dark', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('public accessibility in both themes, navigation and appearance menus', async ({ page }) => {
  await page.goto('/');
  for (const mode of ['Light', 'Dark']) {
    await page.getByRole('button', { name: 'Color theme', exact: true }).click();
    await page.getByRole('menuitem', { name: mode, exact: true }).click();
    await settleAnimations(page);
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
  await settleAnimations(page);
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
  await settleAnimations(page);
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
