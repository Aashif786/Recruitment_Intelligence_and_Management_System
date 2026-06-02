import subprocess
import sys

def run_cmd(cmd):
    print(f"\n=== Executing: {cmd} ===")
    try:
        res = subprocess.run(cmd, shell=True, text=True, capture_output=True, timeout=10)
        print("--- stdout ---")
        print(res.stdout or "<empty>")
        if res.stderr:
            print("--- stderr ---")
            print(res.stderr)
    except Exception as e:
        print(f"Error running command: {e}")

def main():
    print("==================================================")
    print("           VPS DEPLOYMENT DEBUG DUMP              ")
    print("==================================================")
    
    # 1. System Health
    run_cmd("free -h")
    run_cmd("df -h")
    
    # 2. Docker Containers Status
    run_cmd("docker ps -a")
    
    # 3. Docker Compose Services Health/Status
    run_cmd("docker compose -f docker-compose.prod.yml ps")
    
    # 4. Dump backend logs
    run_cmd("docker logs rims-backend_blue-1 --tail 50")
    run_cmd("docker logs rims-backend_green-1 --tail 50")
    
    # 5. Dump frontend logs
    run_cmd("docker logs rims-frontend_blue-1 --tail 30")
    run_cmd("docker logs rims-frontend_green-1 --tail 30")
    
    # 6. Dump Nginx logs
    run_cmd("docker logs rims-nginx-1 --tail 30")
    
    print("==================================================")

if __name__ == "__main__":
    main()
