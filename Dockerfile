# ── Stage 1: Build React frontend ────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
COPY data/courses_output.json public/data/courses_output.json
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
