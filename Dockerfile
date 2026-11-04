# syntax=docker/dockerfile:1
# Single image: the API serves the built SPA from /app/public.

FROM node:22-alpine AS frontend
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS backend
WORKDIR /src
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
# OCR for receipts: tesseract (+ Swedish data) for images, poppler for PDF text.
RUN apk add --no-cache tini tesseract-ocr tesseract-ocr-data-swe poppler-utils \
  && addgroup -S -g 1001 bokly && adduser -S -u 1001 -G bokly bokly \
  && mkdir -p /data/uploads && chown bokly:bokly /data/uploads && chmod 700 /data/uploads
WORKDIR /app
ENV NODE_ENV=production PORT=3000 UPLOAD_DIR=/data/uploads STATIC_DIR=/app/public
COPY --from=backend /src/node_modules ./node_modules
COPY --from=backend /src/dist ./dist
COPY --from=backend /src/package.json ./
COPY --from=frontend /src/dist ./public
USER bokly
EXPOSE 3000
VOLUME ["/data/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
