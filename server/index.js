import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// 載入 .env 檔案中的環境變數
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = process.env.PORT || 8080;
// 支援多組 API KEY，以逗號分隔
const GEMINI_API_KEYS = (process.env.GEMINI_API_KEY || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

// 優先順序模型列表，根據使用者需求加入 Gemini 2.5 Flash
const MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.0-flash-exp',
];

const app = express();
app.use(compression());
app.use(express.json({ limit: '256kb' }));
app.use(express.static(PUBLIC_DIR));

// 簡單的內存速率限制
const rateLimitMap = new Map();
const LIMIT_WINDOW = 5 * 60 * 1000; // 5 分鐘
const MAX_REQUESTS = 2;

const buildPrompt = (courseList) => `你是幽默的學長姐，請為這份課表進行「極簡健檢」。
繁體中文、輕鬆幽默、多用 emoji、Markdown 格式。
請控制在 150 字以內。

課程：
${courseList}

請包含：
1. **✨ 稱號**：一句話中二稱號。
2. **📊 分析**：兩句話精闢分析。
3. **💡 建議**：一個實用提醒。`;

app.post('/api/ai-review', async (req, res) => {
  if (GEMINI_API_KEYS.length === 0) {
    return res.status(503).json({ error: '伺服器尚未設定 GEMINI_API_KEY' });
  }

  // 檢查速率限制 (以 IP 為主)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  const validRequests = userRequests.filter((t) => now - t < LIMIT_WINDOW);

  if (validRequests.length >= MAX_REQUESTS) {
    return res.status(429).json({ error: '你分析得太快啦！學長姐口渴了，請等 5 分鐘後再試。' });
  }

  const courseList = (req.body?.courseList ?? '').toString().slice(0, 4000);
  if (!courseList.trim()) {
    return res.status(400).json({ error: '缺少課表內容' });
  }

  const prompt = buildPrompt(courseList);

  // 遍歷模型與 API Key 進行嘗試
  for (const model of MODELS) {
    for (const key of GEMINI_API_KEYS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const r = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': key,
          },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });

        if (r.ok) {
          const data = await r.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log(`Success with model: ${model} for IP: ${ip}`);
            // 成功後才記錄次數
            validRequests.push(now);
            rateLimitMap.set(ip, validRequests);
            return res.json({ text });
          }
        }

        // 如果是 429 (達限) 或其他錯誤，則繼續嘗試下一組組合
        const errorDetail = await r.text().catch(() => '');
        console.warn(`Model ${model} failed with status ${r.status}. Detail: ${errorDetail.slice(0, 100)}`);
      } catch (err) {
        console.error(`Request to model ${model} failed:`, err.message);
      }
    }
  }

  res.status(502).json({ error: '目前所有 AI 服務均已達限或暫時無法連線，請稍後再試。' });
});

// SPA fallback：其餘路徑都交給前端 index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on :${PORT} (Available keys: ${GEMINI_API_KEYS.length})`);
});
