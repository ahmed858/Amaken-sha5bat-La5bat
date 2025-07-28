import json
with open('temp.json',encoding='utf-8') as file:
    obj = json.load(file)

print(obj)