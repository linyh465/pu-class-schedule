# ── Stage 1: Build React frontend ────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
COPY data/courses_output.json public/data/courses_output.json
RUN npm run build

# ── Stage 2: Node server (靜態檔 + Gemini 代理) ───────────
FROM node:20-alpine
WORKDIR /app

# 後端依賴
COPY server/package.json ./
RUN npm install --omit=dev

# 後端程式 + 前端 build 產物
COPY server/ .
COPY --from=builder /app/dist ./public

ENV PORT=8080
EXPOSE 8080

# GEMINI_API_KEY 由 Railway runtime 環境變數注入，不進前端 bundle
CMD ["node", "index.js"]
