import { slugSchema } from '../validation/post';

export function normalizeCategorySlugs(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()))].filter(
    (value) => slugSchema.safeParse(value).success,
  );
}
