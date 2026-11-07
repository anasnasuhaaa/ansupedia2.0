import { put } from '@vercel/blob';
import { env } from '../env';

export const localUploadName = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(png|jpeg|webp)$/;
export const localUploadDirectory = new URL('../../../.local/uploads/', import.meta.url);
export const uploadsEnabled = () => import.meta.env.DEV || !!env('BLOB_READ_WRITE_TOKEN');

export async function storeImage(bytes: Uint8Array, type: string): Promise<string> {
  const filename = `${crypto.randomUUID()}.${type.split('/')[1]}`;
  const token = env('BLOB_READ_WRITE_TOKEN');
  if (token)
    return (
      await put(`articles/${filename}`, Buffer.from(bytes), {
        access: 'public',
        contentType: type,
        token,
      })
    ).url;
  if (!import.meta.env.DEV) throw Error('Persistent image storage is not configured.');
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(localUploadDirectory, { recursive: true });
  await writeFile(new URL(filename, localUploadDirectory), bytes, { flag: 'wx', mode: 0o600 });
  return `/dev-uploads/${filename}`;
}
