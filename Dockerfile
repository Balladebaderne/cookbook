# Dockerfile for Cookbook Application

# Backend Stage
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend files
COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

# Frontend Stage
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

# Run the build
RUN npm run build

# Final Stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies for backend
COPY package*.json ./
RUN npm install --production

# Copy backend from builder
COPY --from=backend-builder /app/backend ./backend

# Copy frontend build from builder
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose ports
EXPOSE 5000 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "backend/server.js"]
