import sys
import os

os.environ["BACKEND_START_MODE"] = "script"

print("Starting debug run...")
with open("debug.log", "w") as f:
    f.write("DEBUG: Starting import of app.main\n")
    f.flush()
    
    sys.stdout = f
    sys.stderr = f
    
    print("DEBUG: Importing bcrypt...", flush=True)
    import bcrypt
    print("DEBUG: bcrypt imported successfully", flush=True)
    
    print("DEBUG: Importing passlib.handlers.bcrypt...", flush=True)
    import passlib.handlers.bcrypt
    print("DEBUG: passlib.handlers.bcrypt imported successfully", flush=True)

    try:
        print("DEBUG: Importing app.main now...", flush=True)
        import app.main
        print("DEBUG: Import of app.main completed successfully!", flush=True)
    except Exception as e:
        import traceback
        print(f"ERROR: Import failed with: {e}", flush=True)
        traceback.print_exc()
