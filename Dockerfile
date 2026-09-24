# Multi-stage production build for Unmute
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root, backend and frontend manifests for optimized caching
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies across all packages (root postinstall installs backend + frontend)
RUN npm ci

# Copy entire repository source
COPY . .

# Build backend and frontend
RUN npm run build

# Production runtime container
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package*.json ./backend/

# Install only production dependencies for backend
RUN npm --prefix backend ci --omit=dev

# Built API and web app, plus the SQL migrations applied on start (backend/migrations)
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/migrations ./backend/migrations
COPY --from=builder /app/frontend/dist ./frontend/dist

USER node

# Expose production port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start unified application server
CMD ["node", "backend/dist/server.js"]

