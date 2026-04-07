import re
import time
import requests

ICECAST = "http://uk15freenew.listen2myradio.com:4243/"

try:
    html = requests.get(ICECAST, timeout=10).text

    song_match = re.search(r'Current Song:</td>\s*<td[^>]*>(.*?)</td>', html, re.I)
    listeners_match = re.search(r'Current Listeners:</td>\s*<td[^>]*>(\d+)', html, re.I)

    song = song_match.group(1).strip() if song_match else ""
    listeners = int(listeners_match.group(1)) if listeners_match else 0

except:
    song = ""
    listeners = 0

data = {
    "song": song,
    "listeners": listeners,
    "timestamp": int(time.time())
}

with open("metadata.json", "w") as f:
    f.write(str(data).replace("'", '"'))

print("OK:", data)
