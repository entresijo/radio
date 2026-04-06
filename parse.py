import re

with open("raw.html", "r") as f:
    html = f.read()

song_match = re.search(r'Current Song:</td>\s*<td[^>]*>(.*?)</td>', html, re.I)
listeners_match = re.search(r'Current Listeners:</td>\s*<td[^>]*>(\d+)', html, re.I)

song = song_match.group(1).strip() if song_match else ""
listeners = int(listeners_match.group(1)) if listeners_match else 0

print("SONG:", song)
print("LISTENERS:", listeners)

with open("metadata.json", "w") as f:
    f.write(f'{{ "song": "{song}", "listeners": {listeners} }}')
