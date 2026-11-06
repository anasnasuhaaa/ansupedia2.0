import { z } from 'zod';
export function env(name: string): string { return process.env[name] || (import.meta.env?.[name] as string | undefined) || ''; }
export function databaseConfigured() { const value = env('DATABASE_URL'); return /^postgres(ql)?:\/\//.test(value) && !/YOUR_PASSWORD|REPLACE_/.test(value); }
export function databaseUrl() { if (!databaseConfigured()) throw new Error('Set DATABASE_URL to a real PostgreSQL connection string in .env.'); return z.url().parse(env('DATABASE_URL')); }
export function authSettings() {
 const secret = env('BETTER_AUTH_SECRET');
 if (secret.length < 32 || secret.includes('REPLACE_')) throw new Error('Set BETTER_AUTH_SECRET to a secure random value of at least 32 characters.');
 const baseURL = z.url().parse(env('BETTER_AUTH_URL'));
 if (process.env.NODE_ENV === 'production' && !baseURL.startsWith('https://')) throw new Error('Production authentication requires an HTTPS BETTER_AUTH_URL.');
 return { secret, baseURL };
}
