# 1. Build aşaması
FROM node:18-bullseye AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# 2. Production aşaması
FROM node:18-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/tailwind.config.js ./tailwind.config.js
COPY --from=builder /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=builder /app/.env ./.env
EXPOSE 3000
CMD ["npm", "start"] 