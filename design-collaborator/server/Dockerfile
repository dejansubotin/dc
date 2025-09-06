# Backend (Node.js + TypeScript)
FROM node:18-bullseye-slim AS builder

WORKDIR /app/server

# Ensure native modules like better-sqlite3 can build if prebuilds are unavailable
RUN apt-get update && apt-get install -y python3 g++ make && rm -rf /var/lib/apt/lists/*

# Install dependencies (including devDeps for building)
COPY server/package.json server/tsconfig.json ./
# Prefer ci if a lockfile exists, otherwise install
RUN if [ -f package-lock.json ]; then npm ci; else npm install --production=false; fi

# Copy source and build
COPY server/*.ts ./
COPY types.ts ../types.ts
RUN npm run build && ls -la && ls -la dist

# Prune devDependencies for production
RUN npm prune --omit=dev

FROM node:18-bullseye-slim AS runner
WORKDIR /app/server

# Copy built app and production node_modules
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./package.json
COPY server/start.sh ./start.sh
RUN chmod +x ./start.sh

# The DB file will be created at runtime in WORKDIR (/app)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bash", "./start.sh"]
