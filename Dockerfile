# ── Stage 1: Install dependencies ──
FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── Stage 2: Build ──
FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

# ── Stage 3: Production ──
FROM nginx:1.27-alpine-slim AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create cache and temp dirs with proper permissions for non-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:4001/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
