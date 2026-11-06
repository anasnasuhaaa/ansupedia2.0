import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  primaryKey,
  index,
  pgEnum,
  bigint,
} from 'drizzle-orm/pg-core';
import type { JSONContent } from '@tiptap/react';
const dates = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const postStatus = pgEnum('post_status', ['draft', 'published']);
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    excerpt: text('excerpt').notNull().default(''),
    contentJson: jsonb('content_json').$type<JSONContent>().notNull(),
    coverImageUrl: text('cover_image_url'),
    coverImageAlt: text('cover_image_alt'),
    status: postStatus('status').default('draft').notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...dates(),
  },
  (t) => [index('posts_publication_idx').on(t.status, t.publishedAt)],
);
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ...dates(),
});
export const postCategories = pgTable(
  'post_categories',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.categoryId] }),
    index('post_categories_category_idx').on(t.categoryId),
  ],
);
// Better Auth core schema, including database-backed rate limiting for serverless instances.
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  role: text('role').default('user').notNull(),
  ...dates(),
});
export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...dates(),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);
export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    ...dates(),
  },
  (t) => [index('account_user_idx').on(t.userId)],
);
export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...dates(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);
export const rateLimit = pgTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: bigint('count', { mode: 'number' }).notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
});
