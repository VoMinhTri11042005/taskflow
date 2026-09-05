# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install production+build deps in builder
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source and generate Prisma client, build Next
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy runtime artifacts from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/server.js ./server.js

# Ensure correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Wait for Postgres then push schema, seed, and start server
CMD ["sh", "-c", "for i in 1 2 3 4 5 6 7 8 9 10; do npx prisma db push --accept-data-loss && break || sleep 5; done; npx prisma db seed || true; node server.js"]
