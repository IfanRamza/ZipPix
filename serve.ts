import path from 'path';

const DIST_DIR = path.resolve('./dist');

/**
 * Security headers applied to all responses.
 * CSP is also in index.html <meta> as a fallback, but HTTP headers
 * take precedence and cover non-HTML assets too.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://staticimgly.com https://static.cloudflareinsights.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' blob: data:; " +
    "worker-src 'self' blob:; " +
    "connect-src 'self' blob: https://staticimgly.com https://cloudflareinsights.com; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'none';",
};

/** Attach security headers to every response */
function withHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const server = Bun.serve({
  port: 4001,
  async fetch(req) {
    const url = new URL(req.url);

    // Decode and resolve the requested path
    const decoded = decodeURIComponent(url.pathname);
    const resolved = path.resolve(DIST_DIR, '.' + decoded);

    // Block path traversal — resolved path MUST stay inside DIST_DIR
    if (!resolved.startsWith(DIST_DIR + path.sep) && resolved !== DIST_DIR) {
      return withHeaders(new Response('Forbidden', { status: 403 }));
    }

    const file = Bun.file(resolved);
    if (await file.exists()) {
      return withHeaders(new Response(file));
    }

    // SPA fallback
    return withHeaders(new Response(Bun.file(path.join(DIST_DIR, 'index.html'))));
  },
});

console.log(`Serving on http://localhost:${server.port}`);
