import type { APIRoute } from 'astro';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../db/client';
import { categories } from '../../../db/schema';
import { categoryInput } from '../../../lib/validation/post';
import { apiError,readJson } from '../../../lib/api';
export const POST:APIRoute=async({request})=>{try{const body=await readJson(request);const fields={...categoryInput.parse(body),updatedAt:new Date()};const rows=body.id?await getDb().update(categories).set(fields).where(eq(categories.id,z.uuid().parse(body.id))).returning():await getDb().insert(categories).values(fields).returning();return rows.length?Response.json(rows[0]):Response.json({error:'Category not found'},{status:404});}catch(e){return apiError(e);}};
export const DELETE:APIRoute=async({request})=>{try{const body=await readJson(request);await getDb().delete(categories).where(eq(categories.id,z.uuid().parse(body.id)));return Response.json({ok:true});}catch(e){return apiError(e);}};
