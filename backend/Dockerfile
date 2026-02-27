# ---------- BUILD STAGE ----------
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy the entire backend directory
COPY backend/ ./

# Install dependencies
RUN npm install --production || true

# ---------- RUNTIME STAGE ----------
FROM node:18-alpine

WORKDIR /app/backend

# Copy only the backend code from the build stage
COPY --from=backend-builder /app/backend ./

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy the OpenAPI spec into the runtime image so `index.js` can find it
COPY openapi.yaml /app/

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the app
CMD ["node", "index.js"]