# 靜宜大學選課輔助系統

## 專案架構

```
pu-class-schedule/
├── frontend/               # React (Vite) 應用程式
│   ├── src/
│   │   ├── App.jsx         # 主元件（1,200 行，含全部邏輯）
│   │   └── main.jsx
│   ├── public/
│   │   ├── data/
│   │   │   └── courses_output.json   # 動態載入的課程資料（Dockerfile 注入）
│   │   └── notes/          # 課程大綱 PDF（55+ 份）
│   └── package.json        # React 19, Tailwind, Lucide, html2canvas, jsPDF
├── server/                 # Express.js 後端
│   └── index.js            # 靜態檔服務 + Gemini AI 代理
├── data/                   # 原始資料（爬蟲輸出）
│   ├── courses_output.json # ★ 主要課程資料：923 門，119 系所，已解析時間格式
│   ├── courses.json        # 原始格式（依 dep1 / year / required/elective 分類）
│   ├── general_ed.json     # 通識課程列表
│   └── units.json          # 76 個系所單位（dep1, college_cn, offerUnitName）
├── scripts/
│   └── integrate_courses.py # 將爬蟲結果轉換成 courses_output.json 的腳本
├── Dockerfile              # Railway 部署：Stage 1 build React；Stage 2 Node server
└── nginx.conf              # 備用（目前用 Node serve static）
```

## 資料來源

所有課程資料來自靜宜大學課綱查詢系統：
- **URL**：https://mypu.pu.edu.tw/Framework/Academic/CourseCatalogSys/
- **學期**：115-1（2025 秋季）
- **爬蟲時間**：2026-06-01

### API 端點（公開，無需登入）

| 端點 | 方法 | 說明 |
|------|------|------|
| `/getCsrfToken` | GET | 取得 CSRF token |
| `/fetchOfferUnit` | POST | 取得系所列表（需 `fullYearsem`） |
| `/fetchOfferClass` | POST | 取得班級列表（需 `fullYearsem`, `offerUnit`） |
| `/fullSearch` | POST | 搜尋班級課程（需 `fullYearsem`, `offerUnit`, `offerClass`, `category`） |

> **注意**：Headers 需加入 `User-Agent`（Chrome UA）、`X-Requested-With: XMLHttpRequest`、`Referer` 才能通過 WAF。

## 前端應用程式（React + Vite）

**目前實際部署的是 `frontend/` 的 React 應用程式**。Railway 透過 `Dockerfile` 執行 `npm run build` 打包。

### 課程資料載入方式（Phase 1 後）

課程資料**不再**硬編碼在 `App.jsx`，改為動態從 `courses_output.json` 載入：

```js
// App.jsx 啟動時 fetch
const [allCourses, setAllCourses] = useState([]);
useEffect(() => {
  fetch('/data/courses_output.json').then(r => r.json()).then(data => {
    setAllCourses(data);
  });
}, []);
```

`courses_output.json` 的欄位格式：
```json
{
  "id": "1784",
  "name": "資料結構 (二B)",
  "type": "必修",
  "credits": 3,
  "instructor": "莊潤洲",
  "times": [{"day": 2, "periods": [5, 6, 7]}],
  "location": "主顧301",
  "dept": "人工智慧",
  "year": 2,
  "dimension": null,
  "note": ""
}
```

**課程類型（`type` 欄位）**：`必修` / `選修` / `通識` / `通必`（通識必修） / `教必`（教育部必修） / `教選`（教育部選修）。

### 多系所支援（Phase 1，已實作）

- 左側面板頂部有「選擇系所」下拉選單，由 `deptList`（courses_output.json 的所有 `dept` 值）驅動。
- 選擇系所後，課程列表自動過濾至該系所；頁籤動態顯示該系所實際有的類型。
- `selectedDept` 儲存於 localStorage，重新整理後不需重新選擇。
- **本機驗證**：`cd frontend && npm ci && npm run build`（build 成功即可）。

### 配色規則

| 類別 type | 顏色 |
|-----------|------|
| 必修 | 靛藍 indigo |
| 備用必修 | 琥珀 amber |
| 教必 | 青藍 teal |
| 選修 | 翠綠 emerald（fallback 預設色） |
| 教選 | 青綠 cyan |
| 通識 | 紫 purple |
| 通必 | 靛紫 violet |
| 兵役 | 灰 slate |
| 大一重補修 | （預設 emerald） |
| 其他 | 玫瑰紅 rose |

**新增類型 SOP**：在 `App.jsx` 的三處樣式區塊（`CourseCard` borderClass/badgeClass、schedule grid block、PDF export bgColor/borderColor）各加對應顏色，並在 `TAB_ORDER` 陣列插入新 type。

### 課表更新通知彈窗

每次推送課程資料更新後，要同步更新彈窗，讓使用者一進站就看到異動說明。

- **位置**：`App.jsx` 中標記 `{/* 課表更新通知彈窗 */}` 的區塊。
- **彈窗順序**：`updateModal` → `guideModal` → `disclaimerModal`。
- **顯示邏輯**：改用 `sessionStorage` 控制（`updateModalDismissed`），同一瀏覽器 session 只顯示一次。

**每次推送要改的地方**：
1. 標題下日期：`<p>2026-06-03 更新</p>` 改成本次推送日期。
2. 課程清單：更新 `.map()` 的陣列（`{ id, name, cat, loc }`）與說明文字。

> 慣例：彈窗只列「本次新增」的課程，不累積歷史。

## 如何更新課程資料（每學期）

1. **爬蟲**：執行 Python 更新腳本（見下方）輸出原始資料。
2. **轉換**：執行 `python scripts/integrate_courses.py` 產生 `data/courses_output.json`。
3. **部署**：
   ```
   git add data/courses_output.json
   git commit -m "Update courses for 115-2"
   git push  # Railway 自動重新部署
   ```
   Dockerfile 會自動 `COPY data/courses_output.json public/data/courses_output.json`。

### 爬蟲腳本（每學期修改 YEARSEM）

```python
import requests, json

YEARSEM = '1152'  # 格式：YYYP（如 1152 = 114學年度第2學期）
BASE = 'https://mypu.pu.edu.tw/Framework/Academic/CourseCatalogSys/'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'zh-TW,zh;q=0.9',
    'Referer': BASE,
    'X-Requested-With': 'XMLHttpRequest',
}

s = requests.Session()
s.headers.update(HEADERS)
s.get(BASE)

def csrf():
    return s.get(BASE + 'getCsrfToken').json()['csrf_token']

units = json.loads(s.post(BASE + 'fetchOfferUnit',
    data={'csrf_token': csrf(), 'fullYearsem': YEARSEM}).text)

undergrad = []
for unit in units:
    classes = json.loads(s.post(BASE + 'fetchOfferClass',
        data={'csrf_token': csrf(), 'fullYearsem': YEARSEM, 'offerUnit': unit['dep1']}).text)
    for cls in classes:
        code = cls['class']
        if len(code) >= 5 and code[3:5] in ['01','02','03','04']:
            undergrad.append({'dep1': unit['dep1'], 'unit': unit,
                'classCode': code + cls['team'], 'cla_cn': cls['cla_cn'],
                'year': int(code[3:5])})

all_courses = {}
for i in range(0, len(undergrad), 80):
    for cls in undergrad[i:i+80]:
        try:
            r = s.post(BASE + 'fullSearch', data={'csrf_token': csrf(),
                'fullYearsem': YEARSEM, 'offerUnit': cls['dep1'],
                'offerClass': cls['classCode'], 'category': '1'})
            all_courses[cls['classCode']] = {'meta': cls, 'courses': json.loads(r.text).get('courseResult', [])}
        except:
            all_courses[cls['classCode']] = {'meta': cls, 'courses': []}
    print(f"  {min(i+80, len(undergrad))}/{len(undergrad)}")

json.dump(all_courses, open('data/all_courses_raw.json','w'), ensure_ascii=False, indent=2)
print('Done! Run integrate_courses.py next.')
```

## 部署到 Railway

1. Push 到 GitHub repo: `https://github.com/linyh465/pu-class-schedule`
2. Railway 偵測 `Dockerfile` 自動 build（Stage 1: React build，Stage 2: Node server）。
3. 自訂網域 `schedule.piyou.me`（DNS CNAME 指向 Railway）。

## 畢業學分說明

系統目前顯示**總學分數**。各系畢業規定不同，請以各系課程規劃書為準。

## 下一步（Phase 2 & Phase 3）

### Phase 2：畢業學分追蹤

新建 `data/graduation_requirements.json`，儲存各系畢業條件（從各系課程規劃書整理）：

```json
{
  "人工智慧": {
    "totalCredits": 128,
    "categories": {
      "required":  { "label": "專業必修", "minCredits": 42, "types": ["必修"] },
      "elective":  { "label": "專業選修", "minCredits": 43, "types": ["選修", "教選"] },
      "general":   { "label": "通識",     "minCredits": 20, "types": ["通識", "通必"] }
    },
    "ownDeptTimeSlot": { "day": 3, "periods": [5, 6] }
  }
}
```

`ownDeptTimeSlot` 讓系統自動判斷通識課是「本系時段」或「跨系時段」（以時間匹配，不需手動標記）。

UI：新增 `GraduationPanel` 元件（右側工具列），顯示各類別學分進度條。

### Phase 3：老師評分論壇

使用 Supabase 免費方案（`reviews` 表，匿名 RLS）。前端直接呼叫 Supabase REST API，不需新增後端路由。課程卡片加「評價」按鈕，開啟評分 Modal。
