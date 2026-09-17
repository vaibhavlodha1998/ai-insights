# Build context is the repo root, so the Yarn workspace lockfile is available:
#   docker build -f apps/web/Dockerfile .

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/web/package.json apps/web/
RUN yarn workspaces focus web

COPY apps/web apps/web

# Rewrites are resolved at build time, so the API address is baked in here
ARG API_URL=http://api:8000
ENV API_URL=${API_URL} \
    NEXT_TELEMETRY_DISABLED=1
RUN yarn workspace web build

FROM node:22-alpine

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
