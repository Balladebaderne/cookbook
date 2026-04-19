FROM node:18-alpine

WORKDIR /app/backend

# Install dependencies from lockfile only (better build-cache behaviour)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copy the rest of the backend source
COPY backend/ ./

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy the OpenAPI spec into the runtime image so `index.js` can find it
COPY openapi.yaml /app/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "index.js"]
