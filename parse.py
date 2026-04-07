import re
import time
import json
import requests

ICECAST = "http://uk15freenew.listen2myradio.com:4243/"

song = ""
listeners = 0

try:
    res = requests.get(ICECAST, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    html = res.text

    song_match = re.search(r'Current Song:</td>\s*<td[^>]*>\s*(.*?)\s*</td>', html, re.I | re.S)
    listeners_match = re.search(r'Current Listeners:</td>\s*<td[^>]*>\s*(\d+)', html, re.I)

    song = song_match.group(1).strip() if song_match else ""
    listeners = int(listeners_match.group(1)) if listeners_match else 0

    print("SONG:", song)
    print("LISTENERS:", listeners)

except Exception as e:
    print("ERROR:", e)

data = {
    "song": song,
    "listeners": listeners,
    "timestamp": int(time.time())
}

with open("metadata.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)

print("FINAL:", data)
