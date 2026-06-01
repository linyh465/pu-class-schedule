#!/usr/bin/env python3
"""
integrate_courses.py — 靜宜大學 115-1 學期課程資料清洗與轉換管線
==================================================================

將 courses_1151_raw.json 轉換為前端 React 排課系統所需的 courses_output.json。

解決三大核心問題：
  1. 學制過濾：排除碩博士 / 在職專班 / 進學班
  2. 班別合併：AB 班共課去重 + 標註
  3. 時間解析：處理分號 / 換行 / <br> 分隔的複雜時間字串

額外功能：
  4. 通識資訊擷取 (gen_ed_group + dimension)，不判斷本系/跨系
  5. 系所注意事項附加 (department_notes.json)

輸出：data/courses_output.json — JSON 陣列
"""

import json
import os
import re
import sys
import io
from collections import defaultdict, Counter
from typing import List, Dict, Optional, Tuple

# =====================================================================
#  常量定義
# =====================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "data")

INPUT_FILE = "courses_1151_raw.json"
OUTPUT_FILE = "courses_output.json"
DEPT_NOTES_FILE = "department_notes.json"

# 排除碩博 / 專班 / 進學
EXCLUDE_KEYWORDS = ["碩", "博", "專班", "進學"]

# 星期中文 → 數字
DAY_MAP = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 7}

# 年級中文 → 數字
YEAR_MAP = {"一": 1, "二": 2, "三": 3, "四": 4}
YEAR_MAP_REV = {1: "一", 2: "二", 3: "三", 4: "四"}

# 通識 8 大向度（新制 4 + 舊制 4）
# ⚠ 排序很重要：長名稱放前面，避免「永續與在地」被「永續」短前綴誤匹配
DIMENSIONS = [
    # 舊制 (110-114 入學, 大二~大四)
    "永續與在地",
    "宗教與思維",
    "科技與服務",
    "跨域與設計",
    # 新制 (115 入學, 大一)
    "生命智慧",
    "人文美學",
    "社會洞察",
    "自然科學",
]


# =====================================================================
#  模組 A：時間地點解析器  parse_place_time()
# =====================================================================

def parse_place_time(raw_str: str) -> Dict:
    """
    將混亂的 placeTime 字串解析為結構化資料。

    支援格式
    ─────────────────────────────────────────────
    簡單        四 3、 4：主顧103
    分號        二 2：格倫418;\\n3、 4：格倫417
    <br>        一 2：靜安252<br>五 3、 4：靜安252
    &lt;br&gt;  一 2：靜安252&lt;br&gt;五 3、 4：靜安252
    空值        "" 或 None
    ─────────────────────────────────────────────

    Returns
    -------
    dict  {"times": [{"day": int, "periods": [int, ...]}, ...],
           "location": str}
    """
    if not raw_str or not raw_str.strip():
        return {"times": [], "location": ""}

    try:
        text = raw_str.strip()

        # 統一分隔符 → 換行
        text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"&lt;br\s*/?&gt;", "\n", text, flags=re.IGNORECASE)
        text = text.replace(";", "\n")

        segments = [s.strip() for s in text.split("\n") if s.strip()]

        times: List[Dict] = []
        locations: List[str] = []
        last_day: Optional[int] = None

        for seg in segments:
            # 格式 A：有星期前綴  e.g. "四 3、 4：主顧103"
            m_full = re.match(
                r"([一二三四五六日])\s*([\d、,\s]+?)(?:：(.+))?$", seg
            )
            # 格式 B：無星期前綴（繼承上段） e.g. "3、 4：格倫417"
            m_cont = re.match(r"([\d、,\s]+?)(?:：(.+))?$", seg)

            day = None
            periods_raw = None
            location = None

            if m_full:
                day = DAY_MAP.get(m_full.group(1))
                periods_raw = m_full.group(2)
                location = m_full.group(3)
                last_day = day
            elif m_cont and last_day is not None:
                day = last_day
                periods_raw = m_cont.group(1)
                location = m_cont.group(2)
            else:
                continue

            # 解析節次  "3、 4" → [3, 4]  /  "9、10" → [9, 10]
            if day and periods_raw:
                periods = []
                for p in re.split(r"[、,\s]+", periods_raw.strip()):
                    p = p.strip()
                    if p.isdigit():
                        periods.append(int(p))
                if periods:
                    times.append({"day": day, "periods": periods})

            if location and location.strip():
                loc = location.strip()
                if loc not in locations:
                    locations.append(loc)

        return {
            "times": times,
            "location": ", ".join(locations) if locations else "",
        }

    except Exception:
        return {"times": [], "location": ""}


# =====================================================================
#  模組 B：學制過濾器  is_undergraduate()
# =====================================================================

def is_undergraduate(class_name: str) -> bool:
    """
    排除含有「碩」「博」「專班」「進學」的班級。
    """
    return not any(kw in class_name for kw in EXCLUDE_KEYWORDS)


# =====================================================================
#  模組 C：班級資訊擷取  extract_class_info()
# =====================================================================

def extract_class_info(class_name: str) -> Dict:
    """
    從班級名稱擷取 dept / year / section / gen_ed_group / dimension。

    支援模式
    ───────────────────────────────────────────────────────────
    化科二A                 → dept=化科, year=2, section=A
    資工A班                 → dept=資工, year=None, section=A
    生命智慧一H             → dept=通識, dimension=生命智慧, gen_ed_group=一H
    永續與在地二K            → dept=通識, dimension=永續與在地, gen_ed_group=二K
    通識必修一Hd\\n(會計一A) → dept=會計, year=1, section=A
    體選C / 共同選A / 初教A  → dept=體選/共同選/初教
    食營三-食品組            → dept=食營, year=3, section=食品組
    資訊能力Aa班            → dept=資訊能力, section=Aa
    ───────────────────────────────────────────────────────────
    """
    clean = class_name.split("\n")[0].strip()

    result = {
        "dept": clean,
        "year": None,
        "section": None,
        "is_gen_ed": False,
        "gen_ed_group": None,
        "dimension": None,
    }

    # ── 1. 通識向度班級 ──────────────────────────────────────
    for dim in DIMENSIONS:
        if clean.startswith(dim):
            suffix = clean[len(dim):]          # e.g. "二K", "一H"
            result["is_gen_ed"] = True
            result["dimension"] = dim
            result["dept"] = "通識"
            if suffix:
                year_char = suffix[0]
                group_chars = suffix[1:] if len(suffix) > 1 else ""
                result["year"] = YEAR_MAP.get(year_char)
                result["section"] = group_chars or None
                result["gen_ed_group"] = suffix   # 完整保留 "二K"
            return result

    # ── 2. 通識必修 ──────────────────────────────────────────
    if clean.startswith("通識必修"):
        result["is_gen_ed"] = True
        result["dept"] = "通識必修"
        # 從括號提取目標系所  e.g. (會計一A)
        paren = re.search(r"\((.+?)\)", class_name)
        if paren:
            target = extract_class_info(paren.group(1))
            result["dept"] = target["dept"]
            result["year"] = target["year"]
            result["section"] = target["section"]
        else:
            suffix = clean[len("通識必修"):]
            if suffix:
                result["year"] = YEAR_MAP.get(suffix[0])
        return result

    # ── 3. X班格式 (共同課程) ────────────────────────────────
    m = re.match(r"^(.+?)([A-Za-z]+)班$", clean)
    if m:
        result["dept"] = m.group(1)
        result["section"] = m.group(2)
        return result

    # ── 4. 系名+年級+班別 (標準) ─────────────────────────────
    m = re.match(r"^(.+?)(一|二|三|四)([A-Z])$", clean)
    if m:
        result["dept"] = m.group(1)
        result["year"] = YEAR_MAP[m.group(2)]
        result["section"] = m.group(3)
        return result

    # ── 4b. 系名+年級 (無班別) ───────────────────────────────
    m = re.match(r"^(.+?)(一|二|三|四)$", clean)
    if m:
        result["dept"] = m.group(1)
        result["year"] = YEAR_MAP[m.group(2)]
        return result

    # ── 5. 帶分組  e.g. 食營三-食品組 ────────────────────────
    m = re.match(r"^(.+?)(一|二|三|四)-(.+)$", clean)
    if m:
        result["dept"] = m.group(1)
        result["year"] = YEAR_MAP[m.group(2)]
        result["section"] = m.group(3)
        return result

    # ── 6. 體選/共同選/師培 ──────────────────────────────────
    m = re.match(r"^(體選|共同選|初教|中教)([A-Z])$", clean)
    if m:
        result["dept"] = m.group(1)
        result["section"] = m.group(2)
        return result

    # ── 7. 末尾英文字母 e.g. 理學院A, 人社院A ────────────────
    m = re.match(r"^(.+?)([A-Z])$", clean)
    if m:
        result["dept"] = m.group(1)
        result["section"] = m.group(2)
        return result

    # ── 8. Fallback ──────────────────────────────────────────
    return result


# =====================================================================
#  模組 D-helper：從課程名稱括號中提取向度
# =====================================================================

def extract_dimension_from_name(course_name: str) -> Optional[str]:
    """
    從課程名稱的括號中提取通識向度。
    e.g. "社會心理學與自我概念(生命智慧)" → "生命智慧"
         "餐桌上的建築史(永續與在地)"   → "永續與在地"
    """
    for dim in DIMENSIONS:
        if dim in course_name:
            return dim
    return None


# =====================================================================
#  模組 D：去重合併引擎  merge_courses()
# =====================================================================

def _section_annotation(sections: List[str], year: Optional[int]) -> str:
    """
    產生班別標註字串。

    AB 共課  → " (AB班共同)"
    單班 A   → " (二A)"  (含年級)
    X班無年級 → " (A班)"
    無 section → ""
    """
    if not sections:
        return ""

    # 只取單字母 A-Z
    letters = sorted(s for s in sections if len(s) == 1 and s.isalpha() and s.isupper())

    if len(letters) > 1:
        return f" ({''.join(letters)}班共同)"
    elif len(letters) == 1:
        if year:
            y = YEAR_MAP_REV.get(year, str(year))
            return f" ({y}{letters[0]})"
        else:
            return f" ({letters[0]}班)"

    # 非字母 section  e.g. 食品組
    if len(sections) == 1:
        return f" ({sections[0]})"
    return ""


def merge_courses(courses: List[Dict]) -> List[Dict]:
    """
    以 (courseName, teacher, time_raw) 為 Key 去重合併。

    ‧ 收集所有班級名稱，判斷 AB 班共同 / 單班專屬
    ‧ type 衝突時以「強度」最高者為主（必修 > 通必 > 教必 > 通識 > 教選 > 選修）
    ‧ 通識資訊（gen_ed_group / dimension）自動附加
    """
    TYPE_PRIORITY = {"必修": 0, "通必": 1, "教必": 2, "通識": 3, "教選": 4, "選修": 5}

    bucket: Dict[tuple, List[Dict]] = defaultdict(list)
    for c in courses:
        key = (c["name"], c["teacher"], c["time"])
        bucket[key].append(c)

    merged: List[Dict] = []

    for _key, group in bucket.items():
        base = group[0]
        infos = [c["_ci"] for c in group]
        types_list = [c["type"] for c in group]

        # 決定最終 type
        final_type = min(types_list, key=lambda t: TYPE_PRIORITY.get(t, 99))

        # 收集 sections（去重排序）
        sections = sorted({
            i["section"] for i in infos if i.get("section")
        })

        # 主要 dept / year  ── 優先取非 "通識必修" 的
        primary = next((i for i in infos if i["dept"] != "通識必修"), infos[0])
        dept = primary["dept"]
        year = primary["year"]

        # 名稱標註
        annotation = _section_annotation(sections, year)

        # 時間地點
        parsed = parse_place_time(base["time"])

        # 通識：gen_ed_group / dimension
        gen_ed_group = next(
            (i["gen_ed_group"] for i in infos if i.get("gen_ed_group")), None
        )
        dimension = next(
            (i["dimension"] for i in infos if i.get("dimension")), None
        )
        # fallback：從課程名稱括號取向度
        if not dimension and final_type in ("通識", "通必"):
            dimension = extract_dimension_from_name(base["name"])

        # note
        note = _classify_note(dept, final_type)

        merged.append({
            "id":            base["code"],
            "name":          f'{base["name"]}{annotation}',
            "type":          final_type,
            "credits":       int(base.get("credit", 0) or 0),
            "instructor":    base["teacher"],
            "times":         parsed["times"],
            "location":      parsed["location"],
            "dept":          dept,
            "year":          year,
            "sections":      sections,
            "gen_ed_group":  gen_ed_group,
            "dimension":     dimension,
            "note":          note,
            "precautions":   [],
        })

    return merged


def _classify_note(dept: str, course_type: str) -> str:
    """依據 dept / type 給出附加說明標籤。"""
    if dept in ("體選",):
        return "體育選修"
    if dept in ("共同選",):
        return "共同選修"
    if dept in ("初教", "中教") or course_type in ("教必", "教選"):
        return "師培課程"
    # X班格式（沒有 year）的情況由呼叫端另外處理
    return ""


# =====================================================================
#  模組 F：系所注意事項  department_notes.json
# =====================================================================

def load_department_notes() -> Dict[str, List[str]]:
    """
    載入 department_notes.json（若存在）。

    格式範例
    --------
    {
      "資工": ["大三必修「作業系統」需先修「資料結構」"],
      "食營": ["食品組與營養組課程不互通", "實習課程需額外報名"]
    }
    """
    path = os.path.join(DATA_DIR, DEPT_NOTES_FILE)
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"  ⚠️  載入 {DEPT_NOTES_FILE} 失敗：{e}")
        return {}


def attach_precautions(courses: List[Dict], notes: Dict[str, List[str]]) -> int:
    """為課程附加 precautions。回傳受影響的課程數。"""
    if not notes:
        return 0
    count = 0
    for c in courses:
        dept = c.get("dept", "")
        if dept in notes:
            c["precautions"] = notes[dept]
            count += 1
    return count


# =====================================================================
#  I/O helpers
# =====================================================================

def load_json(filename: str):
    with open(os.path.join(DATA_DIR, filename), "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data, filename: str):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  ✅ 已輸出 → {path}")


# =====================================================================
#  主程式
# =====================================================================

def main():
    # Windows 終端 UTF-8
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

    SEP = "═" * 60
    print(SEP)
    print("  靜宜大學 115-1 課程資料清洗管線  integrate_courses.py")
    print(SEP)

    # ── 1. 載入原始資料 ──────────────────────────────────────
    raw = load_json(INPUT_FILE)
    all_courses: List[Dict] = raw.get("courses", [])
    print(f"\n📦 原始資料：{len(all_courses)} 門課程")
    print(f"   學期：{raw.get('semester', 'N/A')}  "
          f"爬取：{raw.get('scraped_at', 'N/A')}")

    # ── 2. 學制過濾 ──────────────────────────────────────────
    undergrad = [c for c in all_courses if is_undergraduate(c.get("class", ""))]
    excluded = len(all_courses) - len(undergrad)
    print(f"\n🔍 學制過濾")
    print(f"   排除（碩/博/專班/進學）：{excluded} 門")
    print(f"   保留（大學部）：{len(undergrad)} 門")

    # ── 3. 解析班級資訊 ──────────────────────────────────────
    for c in undergrad:
        c["_ci"] = extract_class_info(c.get("class", ""))

    # ── 4. 去重合併 ──────────────────────────────────────────
    merged = merge_courses(undergrad)

    # 為沒有 year 的共同課程補充 note
    for c in merged:
        if c["year"] is None and not c["note"]:
            c["note"] = "共同課程"

    print(f"\n🔄 去重合併")
    print(f"   合併前：{len(undergrad)} 門")
    print(f"   合併後：{len(merged)} 門")
    print(f"   消除重複：{len(undergrad) - len(merged)} 門")

    # ── 5. 系所注意事項 ──────────────────────────────────────
    dept_notes = load_department_notes()
    if dept_notes:
        affected = attach_precautions(merged, dept_notes)
        print(f"\n📋 系所注意事項：已為 {affected} 門課程附加 precautions")
    else:
        print(f"\n📋 系所注意事項：{DEPT_NOTES_FILE} 不存在，跳過"
              f"（可自行建立以啟用）")

    # ── 6. 排序（dept → year → type → name）─────────────────
    TYPE_ORDER = {"必修": 0, "通必": 1, "教必": 2, "通識": 3, "教選": 4, "選修": 5}
    merged.sort(key=lambda c: (
        c["dept"],
        c["year"] or 99,
        TYPE_ORDER.get(c["type"], 9),
        c["name"],
    ))

    # ── 7. 統計報告 ──────────────────────────────────────────
    print(f"\n{'─' * 60}")
    print(f"📊 最終統計（{len(merged)} 門課程）")
    print(f"{'─' * 60}")

    # 課程類型
    type_c = Counter(c["type"] for c in merged)
    print(f"\n  📋 課程類型")
    for t, n in type_c.most_common():
        bar = "█" * (n // 10)
        print(f"     {t:6s} {n:4d} 門  {bar}")

    # 通識向度
    gen_ed = [c for c in merged if c.get("gen_ed_group")]
    if gen_ed:
        dim_c = Counter(c.get("dimension", "—") for c in gen_ed)
        print(f"\n  🎓 通識向度（{len(gen_ed)} 門）")
        for d, n in dim_c.most_common():
            print(f"     {d:14s} {n:3d} 門")

        grp_c = Counter(c["gen_ed_group"] for c in gen_ed)
        print(f"\n  📌 通識群組代碼")
        for g, n in sorted(grp_c.items()):
            print(f"     {g:6s} {n:3d} 門")

    # 系所 TOP-15
    dept_c = Counter(c["dept"] for c in merged)
    print(f"\n  🏫 系所分布（前 15）")
    for d, n in dept_c.most_common(15):
        print(f"     {d:22s} {n:4d} 門")

    # ── 8. 輸出 ──────────────────────────────────────────────
    print(f"\n{'─' * 60}")
    save_json(merged, OUTPUT_FILE)
    print(f"   共 {len(merged)} 門課程，欄位：id / name / type / credits / "
          f"instructor / times / location / dept / year / sections / "
          f"gen_ed_group / dimension / note / precautions")
    print(SEP)


# =====================================================================
if __name__ == "__main__":
    main()
