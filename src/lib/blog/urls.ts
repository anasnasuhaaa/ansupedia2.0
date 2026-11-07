/** Shared URL rules for the editor and server-side content validation. */
export function safeUrl(value: unknown, image = false): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (image ? ['https:'] : ['https:', 'http:', 'mailto:']).includes(url.protocol);
  } catch {
    return false;
  }
}
