# Dockerfile for the Cookbook application (backend only)

# ---------- BUILD STAGE ----------
FROM node:18-alpine AS backend-builder

WORKDIR /app/app

# Copy the entire app directory (most robust approach)
COPY app/ ./

# Install dependencies (if package.json exists in app/)
RUN npm install --production || true

# ---------- RUNTIME STAGE ----------
FROM node:18-alpine

WORKDIR /app

# Copy only the backend code from the build stage
COPY --from=backend-builder /app/app ./app

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy the OpenAPI spec into the runtime image so `index.js` can find it
COPY openapi.yaml ./

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the app
CMD ["node", "app/index.js"]