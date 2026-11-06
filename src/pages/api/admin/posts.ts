import type { APIRoute } from 'astro';
import { z } from 'zod';
import { savePost,deletePost } from '../../../db/queries/blog';
import { postInput } from '../../../lib/validation/post';
import { apiError,readJson } from '../../../lib/api';
export const POST:APIRoute=async({request})=>{try{const body=await readJson(request);const id=body.id?z.uuid().parse(body.id):undefined;return Response.json(await savePost(postInput.parse(body),id));}catch(e){return apiError(e);}};
export const DELETE:APIRoute=async({request})=>{try{const {id}=z.object({id:z.uuid()}).parse(await readJson(request));const deleted=await deletePost(id);return deleted.length?Response.json({ok:true}):Response.json({error:'Article not found'},{status:404});}catch(e){return apiError(e);}};
