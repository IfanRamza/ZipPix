# ── Stage 1: Install & Build ──
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# ── Stage 2: Production ──
FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY serve.ts .

USER bun
EXPOSE 4001

CMD ["bun", "run", "serve.ts"]