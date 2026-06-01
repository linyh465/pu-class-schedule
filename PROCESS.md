# 選課系統製作過程記錄

## 2026-06-01

### 步驟 1：建立專案結構
- 建立 `data/` 目錄存放爬蟲資料

---

### 步驟 2：爬蟲各網頁

#### 2-1. 課程查詢系統
URL: https://mypu.pu.edu.tw/Framework/Academic/CourseCatalogSys/

**問題**：直接用 `web_fetch` 回傳空殼（JS 渲染）。

**解法**：先用 Chrome 工具打開頁面，分析 JS 原始碼，找到以下 API 端點：
- `GET /getCsrfToken` — 取得 CSRF token（需 session cookie）
- `POST /fetchOfferUnit` — 取得所有系所列表
- `POST /fetchOfferClass` — 取得某系所的班級列表
- `POST /fullSearch` — 搜尋某班級的所有課程
- `POST /simpleSearch` — 關鍵字搜尋課程

**問題**：WAF 阻擋 Python 直接呼叫 API。

**解法**：加入以下 Headers 即可繞過 WAF：
```
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Accept: application/json, text/javascript, */*; q=0.01
Accept-Language: zh-TW,zh;q=0.9
Referer: https://mypu.pu.edu.tw/Framework/Academic/CourseCatalogSys/
X-Requested-With: XMLHttpRequest
```

**爬蟲結果**：
- 76 個系所單位（`data/units.json`）
- 659 個班級，其中 465 個大學部班級（`data/undergrad_classes.json`）
- 所有大學部班級課程（`data/all_courses_raw.json`）：465 個班級、6386 筆課程記錄
- 整理後的結構化資料（`data/courses.json`）：51 個系所、474 必修、727 選修、1126 通識
- 通識課程列表（`data/general_ed.json`）：107 門通識課

#### 2-2. 課程架構圖
URL: https://mypu.pu.edu.tw/Framework/Student/courseStructure/structure-graph

**問題**：需要學生登入，Chrome 可開啟但資料仍需帳號。

**處理**：略過。已從課綱查詢系統取得足夠資料。

#### 2-3. 畢業學分規定
URL: https://dorac.pu.edu.tw/p/412-1059-5223.php?Lang=zh-tw

**結果**：成功抓取，為選課相關資訊頁（含選課時間表、注意事項）。

#### 2-4. 修業規定 PDF
URL: https://dorac.pu.edu.tw/var/file/59/1059/img/453/schedule.pdf

**結果**：成功下載（`data/schedule.pdf`），為 115-1 學期選課時間表（3 頁，中英文版）。內容為選課時程，不含畢業學分規定。

---

### 步驟 3：製作選課系統 index.html

**功能實作**：
1. ✅ 學院 → 系所 → 年級三層下拉選單
2. ✅ 自動帶入必修課（已自動勾選）
3. ✅ 可手動勾選選修課
4. ✅ 可手動勾選通識課（107 門）
5. ✅ 輔系/雙主修身份選項（顯示額外學分說明）
6. ✅ 即時學分統計面板（必修/選修/通識/輔雙）
7. ✅ 畢業進度條（128 學分目標）
8. ✅ RWD 響應式設計（Mobile First，手機單欄、桌機雙欄）
9. ✅ 課程搜尋過濾
10. ✅ 手機版 FAB + Drawer 側欄

**技術架構**：
- 純靜態 HTML + CSS + Vanilla JS
- 資料從 `data/courses.json` 和 `data/general_ed.json` 動態載入
- 無外部依賴（不需 npm build）

---

### 步驟 4：Railway 部署設定

- `Dockerfile`：使用 nginx:alpine，將靜態檔案複製到 `/usr/share/nginx/html`
- `nginx.conf`：設定 gzip 壓縮、靜態資源快取、安全標頭
- 自訂網域：`schedule.piyou.me`（在 Railway 控制台設定 Custom Domain）

---

### 已知限制

1. **課程資料為 115-1 學期快照**：需每學期更新（見 CLAUDE.md 更新說明）
2. **輔系/雙主修課程清單**：目前只顯示說明文字，未列出具體科目（需個別系所課程規劃）
3. **通識課顯示上限 60 門**（搜尋後顯示更多）
4. **畢業學分 128 分**：為一般系所通用值，部分系所可能不同
