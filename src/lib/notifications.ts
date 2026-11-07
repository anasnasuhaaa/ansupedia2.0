import { toast } from 'sonner';
export { toast };

// Both Astro client scripts and React islands import this same client module.
export const flashMessages = {
  signedIn: 'Signed in successfully.',
  signedOut: 'Signed out successfully.',
  articleCreated: 'Article created successfully. Draft saved.',
  draftSaved: 'Draft saved.',
  articlePublished: 'Article published successfully.',
  articleUpdated: 'Article updated successfully.',
  articleUnpublished: 'Article unpublished and saved as a draft.',
  articleDeleted: 'Article deleted successfully.',
  categoryCreated: 'Category created successfully.',
  categoryUpdated: 'Category updated successfully.',
  categoryDeleted: 'Category deleted successfully.',
} as const;
const key = 'ansupedia:notification';
export function redirectWithNotice(path: string, code: keyof typeof flashMessages) {
  const destination = new URL(path, location.origin);
  if (destination.origin !== location.origin) throw Error('Invalid redirect.');
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ code, path: destination.pathname, expires: Date.now() + 30000 }),
    );
  } catch {
    /* Navigation still works if browser storage is unavailable. */
  }
  location.assign(destination.href);
}
export function consumeFlash() {
  try {
    const raw = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    if (!raw) return;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return;
    const { code, path, expires } = value as Record<string, unknown>;
    if (
      typeof code !== 'string' ||
      !Object.hasOwn(flashMessages, code) ||
      path !== location.pathname ||
      typeof expires !== 'number' ||
      expires < Date.now() ||
      expires > Date.now() + 30000
    )
      return;
    toast.success(flashMessages[code as keyof typeof flashMessages]);
  } catch {
    /* Malformed or unavailable storage must never break a page. */
  }
}
