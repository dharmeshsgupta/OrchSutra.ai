import urllib.request
import re

html = urllib.request.urlopen("https://dashboard-frontend-eta-ruddy.vercel.app/").read().decode("utf-8")
match = re.search(r'src="(/assets/[^"]+\.js)"', html)
if match:
    script_url = "https://dashboard-frontend-eta-ruddy.vercel.app" + match.group(1)
    js = urllib.request.urlopen(script_url).read().decode("utf-8")
    count = js.lower().count("unauthorized")
    print(f"unauthorized appears {count} times")
    if "alibaba/qwen-image" in js.lower():
        print("alibaba/qwen-image is present! THE FIX IS DEPLOYED!")
    else:
        print("alibaba/qwen-image is MISSING! Old deployment!")
else:
    print("Could not find JS bundle")
