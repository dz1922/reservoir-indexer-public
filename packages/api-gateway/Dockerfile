FROM node:18-alpine

WORKDIR /app

COPY packages/adapter/package.json packages/adapter/
COPY packages/adapter/dist packages/adapter/dist

COPY packages/api-gateway/package.json packages/api-gateway/
COPY packages/api-gateway/dist packages/api-gateway/dist

COPY config config

COPY package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile || yarn install --production

WORKDIR /app/packages/api-gateway

CMD ["node", "dist/index.js"]

EXPOSE 3001
