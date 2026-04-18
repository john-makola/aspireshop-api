FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npm install --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY public ./public

EXPOSE ${PORT:-4000}

CMD ["node", "dist/server.js"]
