# Stage 1: Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack to use pnpm
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Copy package files first for better caching
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source code and build
COPY frontend/ .
RUN pnpm run build

# Stage 2: Production Stage
FROM node:20-alpine AS runner
WORKDIR /app

# Enable corepack for production stage too
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Create a non-root user for better security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy production artifacts from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
