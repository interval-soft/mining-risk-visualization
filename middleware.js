// Vercel Edge Middleware for password protection

export const config = {
    matcher: [
        // Match root and index
        '/',
        '/index.html',
    ],
};

export default function middleware(request) {
    // Parse cookies manually
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
        cookieHeader.split(';')
            .filter(c => c.includes('='))
            .map(c => {
                const [key, ...val] = c.trim().split('=');
                return [key, val.join('=')];
            })
    );

    // Check for auth cookie - if authenticated, let the request through
    if (cookies['site_auth'] === 'authenticated') {
        return; // Pass through to the actual page
    }

    // Redirect to login page
    const url = new URL(request.url);
    const redirectUrl = new URL('/login.html', url.origin);
    redirectUrl.searchParams.set('redirect', url.pathname);

    return Response.redirect(redirectUrl.toString(), 302);
}
