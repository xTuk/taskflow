# syntax=docker/dockerfile:1

# Debian "slim" instead of Alpine: Prisma's query engine binary is built
# against glibc, and mixing it with musl (Alpine's libc) is a common source
# of "Unable to require libquery_engine..." failures at runtime. Staying on
# the same base across every stage avoids that entirely.
FROM node:20-bookworm-slim AS base
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---- deps: install once, reused by the builder stage ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` triggers the `postinstall: prisma generate` script, which reads
# prisma/schema.prisma — it has to be present before installing, not after.
COPY prisma ./prisma
RUN npm ci

# ---- builder: compile the Next.js app ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# No DATABASE_URL is needed here: `prisma generate` (run via postinstall
# during `npm ci` above) only reads prisma/schema.prisma, it never connects.
RUN npm run build

# ---- runner: minimal production image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Next's standalone output tracing doesn't always pick up Prisma's
# generated client + native query engine binary reliably, so copy it
# explicitly to be sure it's present at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
