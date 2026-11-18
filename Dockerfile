# Stage 1: Build the React + Vite frontend
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src

RUN npm run build

# Stage 2: Production runtime (Express backend + static built frontend)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DEMO_MODE=true

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist
COPY server.ts ./

EXPOSE 8080

CMD ["npm", "start"]
