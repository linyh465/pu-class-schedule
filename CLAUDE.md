# 靜宜大學選課輔助系統

## 專案架構

```
Class_Schedule/
├── index.html          # 主應用程式（單頁 HTML）
├── Dockerfile          # Railway 部署用（nginx:alpine）
├── nginx.conf          # nginx 設定（gzip、快取、安全標頭）
├── CLAUDE.md           # 本文件
├── PROCESS.md          # 製作過程記錄
└── data/
    ├── courses.json        # 結構化課程資料（依系所/年級）
    ├── general_ed.json     # 通識課程列表
    ├── units.json          # 所有系所單位（76 個）
    ├── all_classes.json    # 所有班級（659 個）
    ├── undergrad_classes.json  # 大學部班級（465 個）
    ├── all_courses_raw.json    # 原始課程資料（爬蟲結果）
    └── schedule.pdf        # 115-1 選課時間表 PDF
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
| `/simpleSearch` | POST | 關鍵字搜尋（需 `simpleYearsem`, `searchName`） |

> **注意**：需在 HTTP request 加入以下 headers 才能通過 WAF：
> - `User-Agent`: Chrome/120 瀏覽器 UA
> - `X-Requested-With`: XMLHttpRequest
> - `Referer`: https://mypu.pu.edu.tw/Framework/Academic/CourseCatalogSys/

## 如何更新課程資料

每學期開始前，用以下 Python 腳本重新爬蟲。修改 `YEARSEM` 為當學期代碼（格式：`YYYP`，如 `1152` = 114學年度第2學期）。

### 更新腳本

```python
import requests, json, os

YEARSEM = '1152'  # ← 修改這裡
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

# 1. 取得系所列表
units = json.loads(s.post(BASE + 'fetchOfferUnit',
    data={'csrf_token': csrf(), 'fullYearsem': YEARSEM}).text)

# 2. 取得所有大學部班級
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

# 3. 爬取課程（每批 80 筆）
all_courses = {}
for i in range(0, len(undergrad), 80):
    batch = undergrad[i:i+80]
    for cls in batch:
        try:
            r = s.post(BASE + 'fullSearch', data={'csrf_token': csrf(),
                'fullYearsem': YEARSEM, 'offerUnit': cls['dep1'],
                'offerClass': cls['classCode'], 'category': '1'})
            all_courses[cls['classCode']] = {'meta': cls, 'courses': json.loads(r.text).get('courseResult', [])}
        except:
            all_courses[cls['classCode']] = {'meta': cls, 'courses': []}
    print(f'  {min(i+80, len(undergrad))}/{len(undergrad)}')

# 4. 整理並存檔
depts = {}
gen_all = {}
unit_map = {u['dep1']: u for u in units}

for classCode, val in all_courses.items():
    dep1 = val['meta']['dep1']
    unit = unit_map.get(dep1, {})
    if dep1 not in depts:
        depts[dep1] = {'dep1': dep1, 'college': unit.get('college_cn',''),
            'name': unit.get('offerUnitName',''), 'years': {}}
    yr = str(val['meta']['year'])
    if yr not in depts[dep1]['years']:
        depts[dep1]['years'][yr] = {'required': [], 'elective': [], 'general': []}
    seen = {k: set(c['no'] for c in v) for k,v in depts[dep1]['years'][yr].items()}
    for c in val['courses']:
        entry = {'name': c.get('courseName',''), 'credit': int(c.get('credit',0) or 0),
            'no': c.get('cus_num',''), 'teacher': c.get('tea_name',''),
            'time': c.get('placeTime',''), 'selectno': c.get('selectno','')}
        t = c.get('cus_select_cn','')
        if t == '必修' and entry['no'] not in seen['required']:
            depts[dep1]['years'][yr]['required'].append(entry); seen['required'].add(entry['no'])
        elif t == '選修' and entry['no'] not in seen['elective']:
            depts[dep1]['years'][yr]['elective'].append(entry); seen['elective'].add(entry['no'])
        elif t and '通' in t:
            if entry['no'] not in gen_all:
                gen_all[entry['no']] = {**entry, 'type': t}
            if entry['no'] not in seen['general']:
                depts[dep1]['years'][yr]['general'].append(entry); seen['general'].add(entry['no'])

json.dump(depts, open('data/courses.json','w'), ensure_ascii=False, indent=2)
json.dump(list(gen_all.values()), open('data/general_ed.json','w'), ensure_ascii=False, indent=2)
print('Done!')
```

## 部署到 Railway

### 初次部署

1. Push 到 GitHub repo: `https://github.com/linyh465/pu-class-schedule`
2. 在 Railway 建立新 Project → Deploy from GitHub
3. Railway 會自動偵測 `Dockerfile` 並 build

### 自訂網域

1. Railway → Service → Settings → Custom Domain
2. 新增 `schedule.piyou.me`
3. 在 DNS 設定 CNAME 指向 Railway 提供的域名

### 更新部署

1. 更新 `data/courses.json`（執行上方更新腳本）
2. `git add data/ && git commit -m "Update courses for XXX semester"`
3. `git push` → Railway 自動重新部署

## 前端應用程式（實際運作的程式）

> ⚠️ 本文件最上方的 `index.html` 為早期單頁版本，**目前實際部署的是 `frontend/` 的 React (Vite) 應用程式**。
> Railway 透過 `Dockerfile` 執行 `npm run build` 打包，因此修改 `frontend/src/App.jsx` 後 push 即會重新部署。

- **課程資料**：直接寫死在 [frontend/src/App.jsx](frontend/src/App.jsx) 開頭的 `ALL_COURSES` 陣列（非從 JSON 讀取）。
- **本機驗證**：`cd frontend && npm ci && npm run build`（build 成功即代表 JSX 無語法錯誤）。

### 如何新增課程

在 `ALL_COURSES` 陣列加入物件，欄位格式如下：

```js
// id=選課代號, day: 1=一 … 5=五, periods: 節次, note 可省略
{ id: '2299', name: '人與當代社會的建構(永續與在地)', type: '通識', note: '跨系二階', credits: 2, instructor: '曾馨婷', times: [{ day: 1, periods: [1, 2] }], location: '主顧222' },
```

- `type`：`必修` / `備用必修` / `選修` / `通識` / `兵役` / `大一重補修`（對應左側頁籤與卡片顏色）。
- `note`：`'本系時段'`（藍色徽章）或 `'跨系二階'`（顯示為橘色「跨班時段」徽章）；通識跨班時段一律用 `'跨系二階'`。
- 多節數連續會自動合併成一個課表方塊；同名同時段同教室的不同班級會自動合併成卡片頁籤。

## 課表更新通知彈窗（每次有新推送即更新）

每次新增/推送課程後，需同步更新「課表更新通知」彈窗，讓使用者一進站就看到本次異動。

- **位置**：[frontend/src/App.jsx](frontend/src/App.jsx)，標記 `{/* 課表更新通知彈窗（第一個彈出…）*/}` 的區塊。
- **彈窗順序**：`updateModalOpen`（第一個，預設 `true`）→「下一步」→ `guideModalOpen`（使用說明）→ `disclaimerModalOpen`（免責聲明）。
  - 對應 state 在 `App()` 開頭：`updateModalOpen=true`、`guideModalOpen=false`、`disclaimerModalOpen=false`。
  - 按鈕 `onClick` 為 `setUpdateModalOpen(false); setGuideModalOpen(true);`，承接舊有的說明流程。

### 每次推送要改的兩個地方

1. **標題下的日期**：`<p ...>2026-06-03 更新</p>` 改成本次推送日期。
2. **課程清單與標題文案**：更新彈窗內 `.map()` 的陣列（`{ id, name, cat, loc }`）與「新增…週一 第 1、2 節 共 N 門」說明文字，列出本次新增的課程。

> 慣例：彈窗只列「本次新增」的課程，不累積歷史；標題用一句話描述本次主題（例：`通識課程跨班時段（人社院 週一 1、2 節）`）。

## 畢業學分說明

系統預設畢業需求為 **128 學分**（靜宜大學大學部通用值）。不同系所實際要求可能略有差異，請依各系課程規劃為準。

| 類別 | 說明 |
|------|------|
| 必修 | 系上規定必修，已自動帶入且不可取消 |
| 選修 | 系所開設選修，點擊卡片可加入/移除 |
| 通識 | 全校通識課程，點擊卡片可加入/移除 |
| 輔/雙修 | 勾選修課身份後，另外計算額外學分 |
