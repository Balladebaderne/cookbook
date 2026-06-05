FROM node:20-alpine

WORKDIR /app/backend

# Install dependencies from lockfile only (better build-cache behaviour)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copy only the application source — not tests, coverage, or lint/test configs —
# so the runtime image holds just the prod deps from `npm ci --omit=dev` plus src.
COPY backend/src ./src

# Copy the OpenAPI spec into the runtime image so `index.js` can find it
COPY openapi.yaml /app/

# Drop the bundled npm CLI from the runtime image. The app runs via `node` and
# never needs a package manager in production; npm vendors its own (vulnerable)
# copies of tar/glob/cross-spawn/minimatch, which are the only remaining image
# CVEs once the app dependencies themselves are clean.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "src/index.js"]
