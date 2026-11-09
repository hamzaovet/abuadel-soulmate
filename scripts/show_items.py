import json
import re

with open("D:/Work/abuadel-soulmate/scripts/soulmate_raw_texts.json", encoding="utf-8") as f:
    data = json.load(f)

for cat, lines in data.items():
    print(f"\n==================== {cat.upper()} ====================")
    for l in lines:
        if l in ["Google Sites", "Report abuse", "Page details", "Page updated"]:
            continue
        print(l)
