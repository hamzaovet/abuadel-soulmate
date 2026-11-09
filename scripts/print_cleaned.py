import json
import re

with open("D:/Work/abuadel-soulmate/scripts/soulmate_cleaned_lines.json", encoding="utf-8") as f:
    data = json.load(f)

for cat, lines in data.items():
    print(f"==================== {cat} ({len(lines)}) ====================")
    for idx, l in enumerate(lines):
        if any(skip in l.lower() for skip in ["google sites", "report abuse", "page details", "page updated"]):
            continue
        print(f"  {idx}: {l}")
