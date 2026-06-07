import json
import os

env_path = 'c:\\Users\\GUPTA DHARMESH\\OneDrive\\Desktop\\django_project\\OpenRouter\\.env'
json_path = 'c:\\Users\\GUPTA DHARMESH\\OneDrive\\Desktop\\django_project\\OpenRouter\\primary-backend\\openrouter-51e78-firebase-adminsdk-fbsvc-a8d3902ad5.json'

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

json_str = json.dumps(data)

with open(env_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open(env_path, 'w', encoding='utf-8') as f:
    for line in lines:
        if line.startswith('FIREBASE_SERVICE_ACCOUNT_KEY='):
            f.write(f"FIREBASE_SERVICE_ACCOUNT_KEY={json_str}\n")
        else:
            f.write(line)

print("Updated .env successfully.")
