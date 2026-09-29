FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY hylda/frontend-web/package*.json ./hylda/frontend-web/
RUN cd hylda/frontend-web && npm ci
COPY hylda/frontend-web ./hylda/frontend-web
RUN cd hylda/frontend-web && npm run build

FROM node:20-alpine AS backend
WORKDIR /app
COPY hylda/backend/package*.json ./hylda/backend/
RUN cd hylda/backend && npm ci --production
COPY hylda/backend ./hylda/backend

# Copy frontend build into backend public folder if exists
COPY --from=frontend-build /app/hylda/frontend-web/build ./hylda/backend/public

ENV PORT=3000
EXPOSE 3000

WORKDIR /app/hylda/backend
CMD ["node", "src/server.js"]
