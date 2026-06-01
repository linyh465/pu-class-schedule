import os
import urllib.request
import json
import ssl
import time

# 略過 SSL 驗證，避免部分憑證問題
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

links_data = [
    ("通用與共同課程", "[教學發展中心]數位及磨課師課程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-01_course.pdf"),
    ("通用與共同課程", "[通識教育中心]通識課程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-02_course.pdf"),
    ("通用與共同課程", "[通識教育中心]教學發展中心-微學分課程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-02-1_course.pdf"),
    ("通用與共同課程", "[通識教育中心]服務學習發展中心-設計思考與社會實踐課程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-02-2_course.pdf"),
    ("通用與共同課程", "[體育室]體育課程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-03_course.pdf"),
    ("通用與共同課程", "[校安中心]全民國防教育軍事訓練課程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-04_course.pdf"),
    ("通用與共同課程", "[師資培育中心]教育學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-05_course.pdf"),
    ("通用與共同課程", "[閱讀書寫中心]閱讀與書寫課程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-06_course.pdf"),
    ("通用與共同課程", "[外語教學中心]非英文系之大一英文課程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-07-1_course.pdf"),
    ("通用與共同課程", "[外語教學中心]選修英語課程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-07-2_course.pdf"),
    ("通用與共同課程", "[資訊學院]資訊能力課程-人工智慧應用及邏輯思維概論", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-08_course.pdf"),
    ("外語學院", "英國語文學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-10_course.pdf"),
    ("外語學院", "西班牙語文學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-11_course.pdf"),
    ("外語學院", "日本語文學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-12_course.pdf"),
    ("人文暨社會科學院", "中國文學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-14_course.pdf"),
    ("人文暨社會科學院", "社會工作與兒童少年福利學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-15_course.pdf"),
    ("人文暨社會科學院", "台灣文學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-16_course.pdf"),
    ("人文暨社會科學院", "法律學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-17_course.pdf"),
    ("人文暨社會科學院", "生態人文學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-18_course.pdf"),
    ("人文暨社會科學院", "大眾傳播學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-19_course.pdf"),
    ("人文暨社會科學院", "教育研究所", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-20_course.pdf"),
    ("人文暨社會科學院", "犯罪防治碩士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-21_course.pdf"),
    ("人文暨社會科學院", "社會企業與社會福利碩士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-22_course.pdf"),
    ("人文暨社會科學院", "原住民族文化碩士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-23_course.pdf"),
    ("人文暨社會科學院", "原住民族健康與社會福利博士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-24_course.pdf"),
    ("人文暨社會科學院", "犯罪防治學士學位學程原住民專班", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-25_course.pdf"),
    ("人文暨社會科學院", "法律學士學位學程原住民專班", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-26_course.pdf"),
    ("人文暨社會科學院", "健康照顧社會工作學士學位學程原住民專班", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-27_course.pdf"),
    ("人文暨社會科學院", "藝術跨域創作學士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-28_course.pdf"),
    ("理學院", "財務工程學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-29_course.pdf"),
    ("理學院", "應用化學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-30_course.pdf"),
    ("理學院", "食品營養學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-31_course.pdf"),
    ("理學院", "化粧品科學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-32_course.pdf"),
    ("理學院", "永續環境與智慧科技學士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-33_course.pdf"),
    ("管理學院", "行銷與數位經營管理學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-34_course.pdf"),
    ("管理學院", "國際企業學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-35_course.pdf"),
    ("管理學院", "會計學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-36_course.pdf"),
    ("管理學院", "觀光事業學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-37_course.pdf"),
    ("管理學院", "財務金融學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-38_course.pdf"),
    ("管理學院", "管理碩士在職專班", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-39_course.pdf"),
    ("管理學院", "創新與創業管理碩士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-40_course.pdf"),
    ("管理學院", "經營管理進修學士班", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-41_course.pdf"),
    ("資訊學院", "資訊管理學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-43_course.pdf"),
    ("資訊學院", "資訊工程學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-44_course.pdf"),
    ("資訊學院", "人工智慧應用學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-45_course.pdf"),
    ("資訊學院", "資料科學暨大數據分析與應用學系", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-46_course.pdf"),
    ("資訊學院", "資訊應用與科技管理碩士在職專班", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-47_course.pdf"),
    ("資訊學院", "國際資訊學士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-48_course.pdf"),
    ("資訊學院", "晶片設計學士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-49_course.pdf"),
    ("國際學院", "寰宇管理碩士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-51_course.pdf"),
    ("國際學院", "寰宇管理學士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-52_course.pdf"),
    ("國際學院", "寰宇外語教育學士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-53_course.pdf"),
    ("國際學院", "智慧媒體與創新科技應用學士學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-54_course.pdf"),
    ("國際學院", "城市創新行銷碩士在職學位學程", "https://dorac.pu.edu.tw/var/file/59/1059/img/1368/1151-55_course.pdf"),
]

output_dir = os.path.join("frontend", "public", "notes")
os.makedirs(output_dir, exist_ok=True)

json_data = {}

for category, name, url in links_data:
    filename = url.split("/")[-1]
    filepath = os.path.join(output_dir, filename)
    
    print(f"Downloading {name}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response, open(filepath, 'wb') as out_file:
            out_file.write(response.read())
            
        if category not in json_data:
            json_data[category] = []
        json_data[category].append({
            "name": name,
            "path": f"/notes/{filename}"
        })
    except Exception as e:
        print(f"Failed to download {url}: {e}")
    
    time.sleep(0.5)  # 避免請求過於頻繁

json_path = os.path.join("frontend", "src", "data", "notes_links.json")
os.makedirs(os.path.dirname(json_path), exist_ok=True)
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(json_data, f, ensure_ascii=False, indent=2)

print(f"\nDone! Downloaded {sum(len(v) for v in json_data.values())} files.")
print(f"JSON index saved to {json_path}")
