# Build from the REPOSITORY ROOT context (Railway "Root Directory" must be empty / "/").
# ---- build ----
FROM node:20-alpine AS build
WORKDIR /repo
# Copy the whole monorepo (node_modules/dist/.next excluded via .dockerignore).
COPY . .
RUN npm install --no-audit --no-fund
RUN npm --workspace @learnova/shared run build \
 && npm --workspace @learnova/backend run build

# ---- runtime ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./
COPY --from=build /repo/shared ./shared
COPY --from=build /repo/backend/dist ./backend/dist
COPY --from=build /repo/backend/package.json ./backend/
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD wget -qO- http://localhost:${PORT:-4000}/health || exit 1
CMD ["node", "backend/dist/index.js"]
