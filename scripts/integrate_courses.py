"""
整合 courses_1151_raw.json 的 1331 門課程到 data/courses.json
並輸出統計資訊
"""
import json
import os
import re
import sys
import io
from collections import defaultdict

# Fix Windows encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

def extract_dept_from_class(class_name):
    """從班級名稱中提取科系名稱，例如 '化科二A' -> '化科'"""
    # 移除年級和班級後綴（數字、英文字母、'碩'、'博'、'專'等）
    match = re.match(r'^(.+?)(一|二|三|四|碩|博|A班|B班|C班|D班|E班|F班)', class_name)
    if match:
        return match.group(1)
    return class_name

def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data, filename):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    # 載入原始資料
    raw = load_json("courses_1151_raw.json")
    courses = raw["courses"]
    
    print(f"=" * 60)
    print(f"  靜宜大學 115-1 學期課程資料整合統計")
    print(f"=" * 60)
    print(f"\n📦 原始資料：{raw['total']} 門課程")
    print(f"📅 學期：{raw['semester']}")
    print(f"🕐 爬取時間：{raw['scraped_at']}")
    
    # === 統計分析 ===
    
    # 1. 科系統計
    dept_set = set()
    dept_courses = defaultdict(list)
    for c in courses:
        dept = extract_dept_from_class(c["class"])
        dept_set.add(dept)
        dept_courses[dept].append(c)
    
    # 2. 必修/選修/通識統計
    type_count = defaultdict(int)
    for c in courses:
        type_count[c["type"]] += 1
    
    # 3. 班級統計
    class_set = set()
    for c in courses:
        class_set.add(c["class"])
    
    # 4. 教師統計
    teacher_set = set()
    for c in courses:
        teacher_set.add(c["teacher"])
    
    # 5. 學分統計
    total_credits = 0
    for c in courses:
        try:
            total_credits += int(c["credit"])
        except ValueError:
            pass
    
    # === 輸出統計 ===
    print(f"\n{'─' * 60}")
    print(f"📊 整合統計")
    print(f"{'─' * 60}")
    
    print(f"\n🏫 科系數量：{len(dept_set)} 個系所/學程")
    print(f"📚 班級數量：{len(class_set)} 個班級")
    print(f"👨‍🏫 教師數量：{len(teacher_set)} 位")
    print(f"🎓 總學分數：{total_credits}")
    
    print(f"\n📋 課程類型統計：")
    for t, count in sorted(type_count.items(), key=lambda x: -x[1]):
        pct = count / len(courses) * 100
        bar = "█" * int(pct / 2)
        print(f"   {t:6s}：{count:5d} 門  ({pct:5.1f}%)  {bar}")
    
    print(f"\n🏛️  各系所/學程課程數：")
    for dept, clist in sorted(dept_courses.items(), key=lambda x: -len(x[1])):
        req = sum(1 for c in clist if c["type"] == "必修")
        elec = sum(1 for c in clist if c["type"] == "選修")
        gen = sum(1 for c in clist if c["type"] == "通識")
        other = len(clist) - req - elec - gen
        detail = f"必修{req}"
        if elec: detail += f"/選修{elec}"
        if gen: detail += f"/通識{gen}"
        if other: detail += f"/其他{other}"
        print(f"   {dept:20s}：{len(clist):4d} 門 ({detail})")
    
    # === 輸出星期分布 ===
    if "by_day" in raw:
        print(f"\n📅 星期分布：")
        for day, count in raw["by_day"].items():
            bar = "█" * (count // 10)
            print(f"   {day}：{count:4d} 門  {bar}")
    
    # === 整合到 courses.json ===
    # 載入現有的 courses.json
    existing = load_json("courses.json")
    
    # 計算現有資料的課程數
    existing_count = 0
    for dep_id, dep_data in existing.items():
        for year, year_data in dep_data.get("years", {}).items():
            for cat in ["required", "elective", "general"]:
                existing_count += len(year_data.get(cat, []))
    
    # 新增 _raw_1151 欄位保存原始爬取資料
    existing["_meta"] = {
        "semester": raw["semester"],
        "scraped_at": raw["scraped_at"],
        "raw_total": raw["total"],
        "integrated_at": "2026-06-01",
        "source": "courses_1151_raw.json"
    }
    existing["_raw_courses_1151"] = courses
    
    save_json(existing, "courses.json")
    
    # 最終統計
    print(f"\n{'─' * 60}")
    print(f"✅ 整合完成！")
    print(f"{'─' * 60}")
    print(f"   既有 courses.json 結構化課程：{existing_count} 門")
    print(f"   新整合 1151 原始課程資料：{len(courses)} 門")
    print(f"   courses.json 已更新（新增 _meta 和 _raw_courses_1151 欄位）")
    
    print(f"\n{'=' * 60}")

if __name__ == "__main__":
    main()
