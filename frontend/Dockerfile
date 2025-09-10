# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY frontend/package*.json ./
# Copy package-lock.json if it exists
COPY frontend/package-lock.json* ./

# Install dependencies - use npm install if package-lock.json doesn't exist
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy frontend source code and build
COPY frontend/ .
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
