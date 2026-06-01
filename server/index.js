import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

const app = express();
app.use(compression());
app.use(express.json({ limit: '256kb' }));
app.use(express.static(PUBLIC_DIR));

const buildPrompt = (courseList) => `你現在是一位幽默且經驗豐富的大學教授/學長姐。請幫我分析以下這名學生的課表，並給予「課表健檢」建議。
請用繁體中文回答，語氣要輕鬆活潑、帶點幽默，並適當使用 emoji。排版請使用 Markdown 格式。

學生的課表包含以下課程：
${courseList}

請務必提供以下三段內容：
### ✨ 課表專屬稱號
(根據這些課程的屬性，為這個課表組合取個好笑、中二或帥氣的名字，例如：通識達人、爆肝工程師、極致的時間管理大師)

### 📊 總體戰力分析
(分析這學期會很閒還是會爆肝？有什麼優缺點？例如：某一天課太密集了要注意體力、選了很有趣的跨域課程等)

### 💡 學長姐的生存建議
(針對這些特定的課程組合，給個實用的小提醒或心理建設)`;

app.post('/api/ai-review', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: '伺服器尚未設定 GEMINI_API_KEY 環境變數' });
  }

  const courseList = (req.body?.courseList ?? '').toString().slice(0, 4000);
  if (!courseList.trim()) {
    return res.status(400).json({ error: '缺少課表內容' });
  }

  try {
    const r = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(courseList) }] }] }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('Gemini API error', r.status, detail.slice(0, 500));
      throw new Error(`Gemini API ${r.status}`);
    }

    const data = await r.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      '哎呀，分析失敗了，AI 腦袋當機中 🤯';
    res.json({ text });
  } catch (err) {
    console.error('ai-review failed:', err.message);
    res.status(502).json({ error: 'AI 服務暫時無法連線' });
  }
});

// SPA fallback：其餘路徑都交給前端 index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on :${PORT} (GEMINI_API_KEY ${GEMINI_API_KEY ? 'set' : 'MISSING'})`);
});
