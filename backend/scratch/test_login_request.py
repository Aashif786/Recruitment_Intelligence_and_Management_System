import urllib.request, json, urllib.error

req = urllib.request.Request(
    'http://127.0.0.1:10000/api/auth/login', 
    data=json.dumps({'email':'caldiminternship@gmail.com','password':'12345678'}).encode(), 
    headers={'Content-Type': 'application/json'}
)
try: 
    res = urllib.request.urlopen(req)
    print("STATUS:", res.status)
    print("BODY:", res.read().decode())
except urllib.error.HTTPError as e: 
    print("HTTP ERROR:", e.code, e.read().decode())
except Exception as e:
    print("ERROR:", e)
