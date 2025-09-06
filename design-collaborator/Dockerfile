# Frontend (React + Vite) served by Nginx

FROM node:18-bullseye-slim AS builder
WORKDIR /app

COPY package.json tsconfig.json vite.config.ts ./
COPY index.html ./
COPY components ./components
COPY services ./services
COPY App.tsx ./App.tsx
COPY index.tsx ./index.tsx
COPY types.ts ./types.ts

RUN npm ci
RUN npm run build

FROM nginx:1.25-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

