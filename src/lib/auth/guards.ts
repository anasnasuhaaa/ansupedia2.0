export function isAdmin(user: {role?: string} | null | undefined): boolean { return user?.role === 'admin'; }
export function isSameOrigin(request: Request): boolean { return request.headers.get('origin') === new URL(request.url).origin; }
