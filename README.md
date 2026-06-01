
```markdown
# 🎓 靜宜大學 人工智慧應用學系 - 自主排課表系統 (PU Class Schedule)

> 專為 **靜宜大學人工智慧應用學系 114學年度入學（大一升大二）** 學生打造的專屬排課表與選課輔助系統。

🌐 **網站網址**：[https://puclass.piypu.me](https://puclass.piypu.me)

---

## 📖 專案簡介

升上大二後，面對必修與各式選修課程，排課常常讓人手忙腳亂。本專案旨在幫助「靜宜大學（PU）人工智慧應用學系」大一升大二的同學，能夠更直覺、高效地模擬與安排下學期的課表。透過本系統，你可以輕鬆預覽每週行程、避免衝堂，並妥善規劃自己的修課學分。

## ✨ 主要功能 (Features)

- **🎯 專屬課程資料庫**：內建 114 學年度入學之人工智慧應用學系大二專屬課程資料（含必修、選修、通識等）。
- **🖱️ 直覺化排課介面**：點擊即可將課程加入課表，視覺化預覽整週上課行程。
- **⚠️ 衝堂偵測機制**：自動檢查所選課程是否有時間重疊，並給予即時提示。
- **📊 學分自動統計**：即時計算目前已選課程的總學分數，確保符合學校規定的學分上下限。
- **📱 RWD 響應式設計**：支援手機、平板與桌機瀏覽，隨時隨地都能排課。

## 🛠️ 技術架構 (Tech Stack)

本專案採用前後端分離架構與容器化部署，主要使用的技術包含：

- **前端 (Frontend)**：HTML5, CSS3, JavaScript
- **後端 / 腳本 (Server / Scripts)**：Python (處理課程資料與後端邏輯)
- **伺服器與部署 (Deployment)**：Docker, Nginx

## 📁 目錄結構 (Directory Structure)

```
pu-class-schedule/
├── frontend/      # 前端網頁程式碼 (UI/UX 介面)
├── server/        # 後端 API 服務
├── scripts/       # 資料處理、爬蟲與自動化腳本 (Python)
├── data/          # 課程相關靜態資料與設定庫
├── nginx.conf     # Nginx 網頁伺服器設定檔
├── Dockerfile     # Docker 容器化部署設定檔
└── README.md      # 專案說明文件
```

## 🚀 本地開發與運行 (Getting Started)
若你想在本地環境運行或參與開發本專案，請參考以下步驟：
### 先決條件
 * 安裝 Docker 與 Docker Compose
 * 安裝 Python 3.x
### 啟動步驟
 1. **複製專案到本地**：
   ```bash
   git clone [https://github.com/linyh465/pu-class-schedule.git](https://github.com/linyh465/pu-class-schedule.git)
   cd pu-class-schedule
   

 2. **使用 Docker 啟動服務**：
   ```bash
   docker build -t pu-class-schedule .
   docker run -d -p 8080:80 pu-class-schedule
   

 3. **預覽網站**：
   打開瀏覽器並前往 http://localhost:8080 即可查看與測試系統。
## 🤝 貢獻與回饋 (Contributing)
歡迎任何人工智慧應用學系的同學或開發者提供協助！
如果你發現課程資料有誤、系統有 Bug，或是希望許願新功能，都非常歡迎透過提交 Issues 或是發起 Pull Request 讓我們知道。
## 📄 授權條款 (License)
本專案採用開源授權，歡迎學習與自由使用。
*Designed & Developed with ❤️ by linyh465*


**修改建議：**
1. README 中已經涵蓋了程式庫裡的 `frontend`、`server`、`scripts` 等實際結構，符合您 GitHub 上的真實樣貌。
2. 授權條款部分若有特定的 License（例如 MIT），您可以在文末括號處加上連結或修改為特定的 License 名稱。


