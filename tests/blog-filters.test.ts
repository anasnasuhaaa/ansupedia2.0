import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { normalizeCategorySlugs } from '../src/lib/blog/filters';
import { postListWhere } from '../src/db/queries/blog';

const compile = (options: Parameters<typeof postListWhere>[0] = {}) =>
  new PgDialect().sqlToQuery(postListWhere(options)!);

describe('public category filters', () => {
  it('normalizes canonical slugs, removes duplicates, and rejects malformed input', () => {
    expect(
      normalizeCategorySlugs([
        ' Cybersecurity ',
        'software-engineering',
        'CYBERSECURITY',
        '',
        '../admin',
        'a--b',
        'a b',
        'x'.repeat(161),
      ]),
    ).toEqual(['cybersecurity', 'software-engineering']);
    expect(normalizeCategorySlugs([])).toEqual([]);
  });

  it('preserves published visibility without a category selection', () => {
    const query = compile();
    expect(query.sql).toContain('"posts"."status" = $1');
    expect(query.sql).toContain('"posts"."published_at" <= $2');
    expect(query.params[0]).toBe('published');
    expect(query.sql).not.toContain('exists');
    expect(compile({ category: [] }).sql).toBe(query.sql);
  });

  it('uses one correlated EXISTS with IN for duplicate-free OR category matching', () => {
    const query = compile({
      q: 'Astro',
      category: ['cybersecurity', 'software-engineering', 'cybersecurity'],
    });
    expect(query.sql.replace(/\s+/g, ' ')).toContain('and exists (select 1 from "post_categories"');
    expect(query.sql).toContain('"post_categories"."post_id" = "posts"."id"');
    expect(query.sql).toContain('"categories"."slug" in ($4, $5)');
    expect(query.params.slice(2)).toEqual(['%Astro%', 'cybersecurity', 'software-engineering']);
  });

  it('accepts legacy single-category options with the same predicate', () => {
    expect(compile({ category: 'cybersecurity' }).sql).toBe(
      compile({ category: ['cybersecurity'] }).sql,
    );
    expect(compile({ category: 'cybersecurity' }).params.at(-1)).toBe('cybersecurity');
  });

  it('binds search input and escapes literal wildcard characters', () => {
    const q = "Astro%_\\' OR 1=1 --";
    const query = compile({ q, category: ['security'] });
    expect(query.sql).not.toContain(q);
    expect(query.sql).toContain('"posts"."title" ilike $3 and exists');
    expect(query.params[2]).toBe("%Astro\\%\\_\\\\' OR 1=1 --%");
  });

  it('keeps administrator visibility, status and single-category semantics', () => {
    expect(postListWhere({ admin: true })).toBeUndefined();
    const query = compile({ admin: true, status: 'draft', category: 'Existing-Slug' });
    expect(query.sql).not.toContain('published_at');
    expect(query.params).toEqual(['draft', 'Existing-Slug']);
  });
});
