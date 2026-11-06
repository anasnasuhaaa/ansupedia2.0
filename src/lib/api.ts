import { ZodError } from 'zod';
export async function readJson(request:Request){const text=await request.text();if(text.length>600_000)throw new Error('Request is too large.');return JSON.parse(text);}
export function apiError(error:unknown):Response{
 if(error instanceof ZodError)return Response.json({error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},{status:400});
 const e=error as {code?:string;cause?:{code?:string};message?:string};
 if(e.code==='23505'||e.cause?.code==='23505')return Response.json({error:'This slug is already in use. Choose another.'},{status:409});
 if(e.code==='23503'||e.cause?.code==='23503')return Response.json({error:'A selected record no longer exists.'},{status:409});
 console.error('CMS request failed', {name:error instanceof Error?error.name:'unknown',code:e.code||e.cause?.code});
 return Response.json({error:'Unable to complete this request. Check your input or try again.'},{status:400});
}
