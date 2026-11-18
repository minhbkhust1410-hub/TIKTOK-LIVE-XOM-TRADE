# syntax=docker/dockerfile:1
FROM node:24-slim

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    TILITA_DATA_DIR=/app/data

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./
COPY src ./src
COPY config ./config
COPY public ./public

RUN mkdir -p /app/data/tts-cache && chown -R node:node /app

USER node
EXPOSE 8080

CMD ["node", "server.js"]
