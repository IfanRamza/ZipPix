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
  // 'unsafe-eval' is required by ndarray (new Function) inside @imgly/background-removal.
  // staticimgly.com serves the background-removal model; cloudflareinsights.com is analytics.
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://staticimgly.com https://static.cloudflareinsights.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "font-src 'self'; " +
    "img-src 'self' blob: data:; " +
    "worker-src 'self' blob:; " +
    "connect-src 'self' blob: https://staticimgly.com https://cloudflareinsights.com; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'none'; " +
    "frame-ancestors 'none';",
};

/**
 * Vite emits content-hashed files under /assets, so they can be cached forever.
 * Everything else (index.html, sw.js, manifest) must revalidate so updates ship.
 */
function cacheControlFor(pathname: string): string {
  return pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
}

/** Attach security + caching headers to every response */
function withHeaders(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  headers.set('Cache-Control', cacheControlFor(pathname));
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

    // Decode and resolve the requested path (malformed encodings are rejected)
    let decoded: string;
    try {
      decoded = decodeURIComponent(url.pathname);
    } catch {
      return withHeaders(new Response('Bad Request', { status: 400 }), url.pathname);
    }
    const resolved = path.resolve(DIST_DIR, '.' + decoded);

    // Block path traversal — resolved path MUST stay inside DIST_DIR
    if (!resolved.startsWith(DIST_DIR + path.sep) && resolved !== DIST_DIR) {
      return withHeaders(new Response('Forbidden', { status: 403 }), url.pathname);
    }

    const file = Bun.file(resolved);
    if (await file.exists()) {
      return withHeaders(new Response(file), url.pathname);
    }

    // Missing hashed assets are real 404s; don't serve index.html as JS
    if (decoded.startsWith('/assets/')) {
      return withHeaders(new Response('Not Found', { status: 404 }), '/404');
    }

    // SPA fallback
    return withHeaders(new Response(Bun.file(path.join(DIST_DIR, 'index.html'))), '/index.html');
  },
});

console.log(`Serving on http://localhost:${server.port}`);
