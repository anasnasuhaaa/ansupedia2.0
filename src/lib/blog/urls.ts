/** Shared URL rules for the editor and server-side content validation. */
export function safeUrl(value: unknown, image = false): boolean {
  if (typeof value !== 'string') return false;
  if (
    image &&
    import.meta.env.DEV &&
    /^\/dev-uploads\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(png|jpeg|webp)$/.test(value)
  )
    return true;
  try {
    const url = new URL(value);
    return (image ? ['https:'] : ['https:', 'http:', 'mailto:']).includes(url.protocol);
  } catch {
    return false;
  }
}
