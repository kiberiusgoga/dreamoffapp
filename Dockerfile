# One image, one process: Express serves the built React app and the API from
# the same origin. That is what app.ts already does, so there is no CORS, no
# absolute API base URL and no rewrite rules to keep in sync.
#
# Debian slim rather than Alpine on purpose: sqlite3 publishes prebuilt
# binaries for glibc, and on musl it falls back to compiling from source,
# which needs a toolchain in the image.

# ── Stage 1: build the frontend ─────────────────────────────────────────────
FROM node:22-slim AS frontend

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: server dependencies ────────────────────────────────────────────
FROM node:22-slim AS deps

WORKDIR /build/server
COPY server/package.json server/package-lock.json ./
# tsx transforms TypeScript at load, so it is a runtime dependency here and
# lives in dependencies rather than devDependencies. --omit=dev drops the
# typechecker and the type packages, which the running server never needs.
RUN npm ci --omit=dev

# ── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Source is copied rather than compiled. The server resolves the frontend,
# the database and the uploads directory relative to import.meta.url, so
# moving files into a build output directory would silently change all three.
# tsx transforms on load; the alternative is fixing those paths first.
COPY --from=deps  /build/server/node_modules ./server/node_modules
COPY server ./server
COPY --from=frontend /build/dist ./dist

# Persistent state lives on the mounted volume, never in the image layer.
# Both are read from the environment by models/db.ts and storage.ts.
ENV DATABASE_PATH=/data/database.sqlite \
    UPLOADS_PATH=/data/uploads

RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 5000
ENV PORT=5000

# The platform's health check should hit this; it is cheap and does not touch
# the database.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/server
CMD ["npm", "start"]
