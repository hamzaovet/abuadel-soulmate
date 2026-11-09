import urllib.request
import re
import json

urls = [
    ("hot-drinks", "https://sites.google.com/view/soulmatemenu/hot-drinks"),
    ("ice-coffe", "https://sites.google.com/view/soulmatemenu/ice-coffe"),
    ("frappe", "https://sites.google.com/view/soulmatemenu/frappe"),
    ("mojito", "https://sites.google.com/view/soulmatemenu/mojito"),
    ("smoothie", "https://sites.google.com/view/soulmatemenu/smoothie"),
    ("soft-drinks", "https://sites.google.com/view/soulmatemenu/soft-drinks"),
    ("pancake", "https://sites.google.com/view/soulmatemenu/pancake"),
    ("pastry", "https://sites.google.com/view/soulmatemenu/pastry"),
    ("dessert", "https://sites.google.com/view/soulmatemenu/dessert"),
    ("ice-cream", "https://sites.google.com/view/soulmatemenu/ice-cream"),
    ("extra", "https://sites.google.com/view/soulmatemenu/extra"),
]

nav_items = {
    "hot drinks", "ice coffe", "frappe", "mojito", "smoothie",
    "soft drinks", "pancake", "pastry", "dessert", "ice cream",
    "extra", "soulmate menu", "home page", "more", "search this site",
    "embedded files", "skip to main content", "skip to navigation"
}

results = {}

for cat_key, url in urls:
    print(f"Fetching {cat_key}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode("utf-8")
        
        # Remove scripts and styles
        no_scripts = re.sub(r'<script.*?</script>', '', html, flags=re.DOTALL)
        no_styles = re.sub(r'<style.*?</style>', '', no_scripts, flags=re.DOTALL)
        
        # Match headings, paragraphs, spans, divs
        matches = re.findall(r'<(h[1-6]|p|div|span)[^>]*>(.*?)</\1>', no_styles)
        
        cleaned = []
        for tag, text in matches:
            t = re.sub(r'<[^>]+>', ' ', text).strip()
            # Clean up weird non-breaking spaces or emoji
            t = re.sub(r'\s+', ' ', t).strip()
            if t and len(t) < 150:
                # ignore pure code/js
                if not t.startswith('window.') and not t.startswith('{') and not t.startswith('/*') and not t.startswith('.rrJNTc'):
                    cleaned.append(t)
        
        # Filter out nav items
        filtered = []
        for c in cleaned:
            c_low = c.lower().strip()
            if c_low in nav_items:
                continue
            filtered.append(c)
        
        results[cat_key] = filtered
    except Exception as e:
        print(f"Error fetching {cat_key}: {e}")
        results[cat_key] = []

with open("scripts/soulmate_raw_texts.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Saved raw texts to scripts/soulmate_raw_texts.json")
