import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';
import { env } from '../../../lib/env';
export const POST:APIRoute=async({request})=>{
 if(!env('BLOB_READ_WRITE_TOKEN'))return Response.json({error:'Uploads are disabled. Use an HTTPS image URL.'},{status:503});
 if(Number(request.headers.get('content-length'))>4_000_000)return Response.json({error:'Maximum image size is 3 MB.'},{status:413});
 try{const file=(await request.formData()).get('file');if(!(file instanceof File)||file.size>3_000_000)return Response.json({error:'Choose an image under 3 MB.'},{status:400});
 const b=new Uint8Array(await file.arrayBuffer());const type=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71?'image/png':b[0]===255&&b[1]===216&&b[2]===255?'image/jpeg':String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP'?'image/webp':null;
 if(!type||file.type!==type)return Response.json({error:'Only valid PNG, JPEG and WebP images are supported.'},{status:400});
 const blob=await put(`articles/${crypto.randomUUID()}.${type.split('/')[1]}`,Buffer.from(b),{access:'public',contentType:type,token:env('BLOB_READ_WRITE_TOKEN')});return Response.json({url:blob.url});
 }catch{console.error('Image upload failed');return Response.json({error:'Image upload failed. Try again.'},{status:500});}
};
