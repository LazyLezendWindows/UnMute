# Multi-stage production build for Unmute
FROM node:20-alpine AS builder

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
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy root manifest
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install only production dependencies for backend
RUN npm --prefix backend ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/data ./backend/data
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose production port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start unified application server
CMD ["node", "backend/dist/server.js"]

