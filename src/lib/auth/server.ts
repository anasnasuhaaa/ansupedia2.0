import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { getDb } from '../../db/client';
import * as schema from '../../db/schema';
import { authSettings } from '../env';
let instance: ReturnType<typeof createAuth> | undefined;
function createAuth() {
  const settings = authSettings();
  return betterAuth({
    ...settings,
    database: drizzleAdapter(getDb(), { provider: 'pg', schema }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
    user: { additionalFields: { role: { type: 'string', defaultValue: 'user', input: false } } },
    trustedOrigins: [
      new URL(settings.baseURL).origin,
      // Both production domains serve the same app; browsers send distinct origins.
      'https://ansupedia.my.id',
      'https://www.ansupedia.my.id',
    ],
    session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60 },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: { '/sign-in/email': { window: 60, max: 5 } },
    },
    advanced: {
      useSecureCookies: settings.baseURL.startsWith('https://'),
      ipAddress: { ipAddressHeaders: ['x-ansupedia-client-ip'] },
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
    },
  });
}
export function getAuth() {
  return (instance ??= createAuth());
}
