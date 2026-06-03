# ---- base ----
FROM node:20-bookworm-slim AS base
WORKDIR /app

# ---- build (installs all deps, runs next build) ----
FROM base AS build
# Leave NODE_ENV unset so `npm ci` installs devDependencies (tsx, next, typescript)
# AND `next build` runs under its production runtime.
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
# NEXT_PUBLIC_* is inlined into the client bundle at build time -> must be a build arg.
# Coolify passes a build-time env var of the same name through as --build-arg.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
RUN npm run build

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
RUN useradd -m -u 1001 appuser
# Full node_modules kept on purpose: `npm start` -> `tsx server/index.ts` needs tsx,
# cross-env, next and the TS source (server/, src/) at runtime.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/tsconfig.json ./tsconfig.json
USER appuser
EXPOSE 3000
CMD ["npm", "start"]
