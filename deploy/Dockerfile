FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DATA_DIR=/data NODE_OPTIONS=--max-old-space-size=192
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --chown=node:node dist/ ./dist/
COPY --chown=node:node server/ ./server/
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node","server/index.mjs"]
