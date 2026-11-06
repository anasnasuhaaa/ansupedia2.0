import { defineMiddleware } from 'astro:middleware';
import { getAuth } from './lib/auth/server';
import { isAdmin, isSameOrigin } from './lib/auth/guards';
import { databaseConfigured } from './lib/env';
export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.user = null;
  const path = ctx.url.pathname;
  const protectedPath =
    (path.startsWith('/admin') && path != '/admin/login') || path.startsWith('/api/admin');
  if (protectedPath) {
    if (!databaseConfigured())
      return path.startsWith('/api/')
        ? new Response('CMS setup required', { status: 503 })
        : ctx.redirect('/admin/login?setup=1');
    try {
      const session = await getAuth().api.getSession({ headers: ctx.request.headers });
      ctx.locals.user = session?.user ?? null;
    } catch {
      console.error('Admin session lookup failed');
      return new Response('Authentication temporarily unavailable', { status: 503 });
    }
    if (!isAdmin(ctx.locals.user))
      return path.startsWith('/api/')
        ? new Response('Unauthorized', { status: 401 })
        : ctx.redirect('/admin/login');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(ctx.request.method) && !isSameOrigin(ctx.request))
      return new Response('Invalid request origin', { status: 403 });
  }
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  if (path.startsWith('/admin') || path.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
});
