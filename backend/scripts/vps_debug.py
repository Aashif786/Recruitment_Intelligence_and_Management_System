import os
import subprocess
import json
import urllib.request

def run_cmd(cmd):
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return f"STDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}\nEXIT CODE: {res.returncode}"
    except Exception as e:
        return f"FAILED TO RUN: {cmd}\nERROR: {e}"

def main():
    debug_data = {}
    debug_data["docker_ps"] = run_cmd("docker ps -a")
    debug_data["nginx_conf"] = run_cmd("cat nginx.conf")
    
    # Check what routes are registered inside the running containers
    debug_data["routes_green"] = run_cmd("docker compose -f docker-compose.prod.yml exec -T backend_green python -c \"import os; os.environ['BACKEND_START_MODE']='docker'; from app.main import app; print([(r.path, r.methods) for r in app.routes if 'access' in r.path])\"")
    debug_data["routes_blue"] = run_cmd("docker compose -f docker-compose.prod.yml exec -T backend_blue python -c \"import os; os.environ['BACKEND_START_MODE']='docker'; from app.main import app; print([(r.path, r.methods) for r in app.routes if 'access' in r.path])\"")
    
    # Check the contents of backend/app/api/interviews.py on VPS
    debug_data["vps_interviews_lines"] = run_cmd("sed -n '65,75p' backend/app/api/interviews.py")
    
    # Try checking docker logs
    debug_data["docker_logs"] = run_cmd("docker compose -f docker-compose.prod.yml logs --tail=50")
    
    # Let's inspect git commit hash on VPS
    debug_data["git_log"] = run_cmd("git log -n 5")
    
    # Format value as string
    debug_value = json.dumps(debug_data, indent=2)
    
    # Supabase credentials from environment
    supabase_url = "https://itajqbrebdbrunfqpbmg.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0YWpxYnJlYmRicnVuZnFwYm1nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkwMzMxNCwiZXhwIjoyMDg5NDc5MzE0fQ.J4tJb0Si_vx47r2_zo3ZqbdfvczaZU_fBKSWL8KwyX8"
    
    url = f"{supabase_url}/rest/v1/global_settings?on_conflict=key"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    payload = {
        "key": "vps_debug_info",
        "value": debug_value
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            print("Successfully uploaded VPS debug info to Supabase. Status:", response.status)
    except Exception as e:
        print("Failed to upload to Supabase:", e)
        if hasattr(e, "read"):
            print(e.read().decode("utf-8"))

if __name__ == "__main__":
    main()
