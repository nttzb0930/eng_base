# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV DATABASE_URL="postgresql://docker-build:docker-build@localhost:5432/eng_base?schema=public"

RUN corepack enable

WORKDIR /workspace

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/shared build
RUN pnpm --filter @repo/api db:generate
RUN pnpm --filter @repo/api build
RUN pnpm --filter @repo/api deploy --prod --legacy /production/api
RUN cp -R apps/api/dist /production/api/dist

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV API_PORT=4000

WORKDIR /app

COPY --from=builder --chown=node:node /production/api ./

USER node

EXPOSE 4000

CMD ["node", "dist/main.js"]
