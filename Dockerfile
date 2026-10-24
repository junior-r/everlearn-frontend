FROM node:24-alpine AS base
RUN npm install -g pnpm@11
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]

FROM deps AS build
# Next.js writes these into the browser bundle while building: setting them on the container is too late
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_LIVEKIT_URL
ARG NEXT_PUBLIC_VIDEO_SERVER_URL
# Optional: without it the public forms show no bot check
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL \
    NEXT_PUBLIC_VIDEO_SERVER_URL=$NEXT_PUBLIC_VIDEO_SERVER_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
# Without them the bundle would call localhost from every visitor's browser
RUN test -n "$NEXT_PUBLIC_API_URL" && test -n "$NEXT_PUBLIC_LIVEKIT_URL" && test -n "$NEXT_PUBLIC_VIDEO_SERVER_URL"     || (echo "Pass NEXT_PUBLIC_API_URL, NEXT_PUBLIC_LIVEKIT_URL and NEXT_PUBLIC_VIDEO_SERVER_URL as build args" >&2; exit 1)
COPY . .
RUN pnpm build

FROM base AS prod
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
# The server writes its cache under .next, so that folder belongs to the user it runs as
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts
USER node
EXPOSE 3000
CMD ["pnpm", "start"]
