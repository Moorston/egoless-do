FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN apk add --no-cache python3 build-base && \
    npm install && \
    apk del python3 build-base

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
