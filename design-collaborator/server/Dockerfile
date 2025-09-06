# Backend (Node.js + TypeScript)
FROM node:18-bullseye-slim AS builder

WORKDIR /app/server

# Ensure native modules like better-sqlite3 can build if prebuilds are unavailable
RUN apt-get update && apt-get install -y python3 g++ make && rm -rf /var/lib/apt/lists/*

# Install dependencies (including devDeps for building)
COPY server/package.json server/tsconfig.json ./
RUN npm install --production=false

# Copy source and build
COPY server/*.ts ./
COPY types.ts ../types.ts
RUN npm run build

# Prune devDependencies for production
RUN npm prune --omit=dev

FROM node:18-bullseye-slim AS runner
WORKDIR /app/server

# Copy built app and production node_modules
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./package.json

# The DB file will be created at runtime in WORKDIR (/app)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
