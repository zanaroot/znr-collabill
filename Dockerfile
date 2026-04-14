FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

ARG DATABASE_URL=postgresql://build:build@postgres:5432/collabill_db
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_S3_ENDPOINT=http://localhost:9100
ARG NODE_ENV=production
ARG S3_ENDPOINT=http://minio:9000
ARG MINIO_ROOT_USER=minio_root
ARG MINIO_ROOT_PASSWORD=build-placeholder
ARG S3_ACCESS_KEY=minio_user
ARG S3_SECRET_KEY=build-placeholder
ARG S3_BUCKET=my-buckets
ARG S3_REGION=us-east-1
ARG ENCRYPTION_KEY=build-placeholder-12345678901234567890123456789012

ENV ENCRYPTION_KEY=$ENCRYPTION_KEY
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_S3_ENDPOINT=$NEXT_PUBLIC_S3_ENDPOINT
ENV NODE_ENV=$NODE_ENV
ENV S3_ENDPOINT=$S3_ENDPOINT
ENV MINIO_ROOT_USER=$MINIO_ROOT_USER
ENV MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
ENV S3_ACCESS_KEY=$S3_ACCESS_KEY
ENV S3_SECRET_KEY=$S3_SECRET_KEY
ENV S3_BUCKET=$S3_BUCKET
ENV S3_REGION=$S3_REGION

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node","server.js"]

FROM base AS migrator
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

CMD ["pnpm","db:migrate"]
