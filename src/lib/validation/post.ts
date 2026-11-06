import { z } from 'zod';
import { safeUrl, validateContent } from '../blog/content';
export const slugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens.');
export const imageUrl = z
  .string()
  .max(2048)
  .refine((s) => s === '' || safeUrl(s, true), 'Use an HTTPS image URL.');
export const postInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    slug: slugSchema,
    excerpt: z.string().max(500),
    contentJson: z.unknown().transform((v, ctx) => {
      try {
        return validateContent(v);
      } catch (e) {
        ctx.addIssue({
          code: 'custom',
          message: e instanceof Error ? e.message : 'Invalid content',
        });
        return z.NEVER;
      }
    }),
    coverImageUrl: imageUrl.default(''),
    coverImageAlt: z.string().max(300).default(''),
    status: z.enum(['draft', 'published']),
    isFeatured: z.boolean(),
    seoTitle: z.string().max(70).default(''),
    seoDescription: z.string().max(170).default(''),
    categoryIds: z
      .array(z.uuid())
      .max(30)
      .transform((ids) => [...new Set(ids)]),
  })
  .refine((p) => !p.coverImageUrl || p.coverImageAlt.trim().length > 0, {
    message: 'Add descriptive alternative text for the cover image.',
    path: ['coverImageAlt'],
  });
export const categoryInput = z.object({ name: z.string().trim().min(1).max(80), slug: slugSchema });
export type PostInput = z.infer<typeof postInput>;
