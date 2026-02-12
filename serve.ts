const server = Bun.serve({
  port: 4001,
  async fetch(req) {
    const url = new URL(req.url);
    const filePath = `./dist${url.pathname}`;

    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback
    return new Response(Bun.file('./dist/index.html'));
  },
});

console.log(`Serving on http://localhost:${server.port}`);
