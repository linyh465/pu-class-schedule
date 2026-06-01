# ── Stage 1: Build React frontend ────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
COPY data/courses_output.json public/data/courses_output.json

# Vite 在 build 階段把 VITE_ 變數寫死進輸出 JS，必須在此宣告才讀得到
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
RUN npm run build

# ── Stage 2: Serve with nginx ────────────────────────────
FROM nginx:alpine

# Copy built React app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config template
COPY nginx.conf /etc/nginx/nginx.conf.template

EXPOSE 80

# Substitute $PORT at runtime, leaving nginx variables untouched
CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
