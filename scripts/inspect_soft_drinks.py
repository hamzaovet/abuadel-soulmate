import urllib.request
import re

url = "https://sites.google.com/view/soulmatemenu/soft-drinks"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode("utf-8")

idx = html.find('role="main"')
if idx != -1:
    end_idx = html.find('</main>', idx)
    content = html[idx:end_idx if end_idx != -1 else idx+5000]
    with open("scripts/soft_main_utf8.html", "w", encoding="utf-8") as f:
        f.write(content)
