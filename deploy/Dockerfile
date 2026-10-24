FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DATA_DIR=/data NODE_OPTIONS=--max-old-space-size=192
WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules/ ./node_modules/
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node dist/ ./dist/
COPY --chown=node:node server/ ./server/
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node","server/index.mjs"]
