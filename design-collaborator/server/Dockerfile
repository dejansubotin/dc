# Backend (Node.js + TypeScript)
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Install dependencies (including devDeps for building)
COPY server/package.json server/tsconfig.json ./
RUN npm ci

# Copy source and build
COPY server/*.ts ./
COPY types.ts ../types.ts
RUN npm run build

# Prune devDependencies for production
RUN npm prune --omit=dev

FROM node:18-bullseye-slim AS runner
WORKDIR /app

# Copy built app and production node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# The DB file will be created at runtime in WORKDIR (/app)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]

