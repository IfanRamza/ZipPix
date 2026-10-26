# Pinned to an exact release so security fixes are deliberate upgrades.
# 1.4.4 fixes the bundled Brotli decoder (CVE-2026-111497, GHSA-663w-cv8g-jj2p).
ARG BUN_VERSION=1.4.4

# ── Stage 1: Install & Build ──
FROM oven/bun:${BUN_VERSION}-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# ── Stage 2: Production ──
FROM oven/bun:${BUN_VERSION}-alpine
ENV NODE_ENV=production
# Pick up Alpine package fixes released after the base image was built
RUN apk upgrade --no-cache
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY serve.ts .

USER bun
EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:4001/ || exit 1

CMD ["bun", "run", "serve.ts"]
