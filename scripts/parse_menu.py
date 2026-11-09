import json
import re

with open("scripts/soulmate_raw_texts.json", encoding="utf-8") as f:
    raw_data = json.load(f)

parsed_menu = {}

for cat, lines in raw_data.items():
    print(f"\n==================== {cat.upper()} ====================")
    # clean lines
    cleaned = []
    for l in lines:
        # replace non-ascii emojis or strange symbols
        l_clean = re.sub(r'[^\x00-\x7F\u0600-\u06FF\s]', '', l).strip()
        l_clean = re.sub(r'\s+', ' ', l_clean).strip()
        if l_clean:
            cleaned.append(l_clean)
    
    parsed_menu[cat] = cleaned
    for idx, c in enumerate(cleaned):
        print(f"[{idx}] {c}")

with open("scripts/soulmate_cleaned_lines.json", "w", encoding="utf-8") as f:
    json.dump(parsed_menu, f, ensure_ascii=False, indent=2)
