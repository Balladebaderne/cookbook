# Dockerfile for Cookbook Application

# Backend Stage
FROM node:18-alpine AS backend-builder

WORKDIR /app/app

# Copy backend files
COPY app/package*.json ./
RUN npm install --production

COPY app/ ./

# Frontend Stage (optional - currently development only)
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend files if they exist
COPY frontend/package*.json ./
RUN npm install || true

COPY frontend/ ./

# Run the build if possible
RUN npm run build || true

# Final Stage
FROM node:18-alpine

WORKDIR /app

# Copy OpenAPI spec
COPY openapi.yaml ./

# Copy app (backend)
COPY --from=backend-builder /app/app ./app

# Optional: Copy frontend build if it exists
COPY --from=frontend-builder /app/frontend/build ./frontend/build || true

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "app/index.js"]
