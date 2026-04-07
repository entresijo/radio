import re
import time
import requests

URL = "https://entresijo.radiostream123.com/"

html = requests.get(URL, timeout=10).text

# ===== STREAM =====
stream_match = re.search(r'(https://[^"]+live\.mp3[^"]+)', html)
stream = stream_match.group(1) if stream_match else ""

# ===== ICECAST SERVER =====
server_match = re.search(r'(http://[^"]+:\d+/)', html)
server = server_match.group(1) if server_match else ""

song = ""
listeners = 0

if server:
    try:
        icecast_html = requests.get(server, timeout=10).text

        song_match = re.search(r'Current Song:</td>\s*<td[^>]*>(.*?)</td>', icecast_html, re.I)
        listeners_match = re.search(r'Current Listeners:</td>\s*<td[^>]*>(\d+)', icecast_html, re.I)

        song = song_match.group(1).strip() if song_match else ""
        listeners = int(listeners_match.group(1)) if listeners_match else 0

    except:
        pass

data = {
    "stream": stream,
    "song": song,
    "listeners": listeners,
    "timestamp": int(time.time())
}

with open("metadata.json", "w") as f:
    f.write(str(data).replace("'", '"'))

print("OK:", data)
