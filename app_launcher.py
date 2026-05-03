import subprocess
import signal
import sys
import os
import time
import webbrowser
import threading

MAIN_APP_DIR = r"C:\mahmood\pld"
shutdown_requested = False
CUSTOM_URL = "http://localhost:3000/report/gate"

# Store all process objects
processes = []

def signal_handler(sig, frame):
    global shutdown_requested
    if shutdown_requested:
        print("\nForce shutdown - Killing everything...")
        force_shutdown()
    else:
        print("\n\n" + "="*50)
        print("SHUTTING DOWN... Press Ctrl+C again for force shutdown")
        print("="*50)
        shutdown_requested = True
        graceful_shutdown()

def graceful_shutdown():
    global processes
    
    print("\n[1/3] Stopping Redis container...")
    subprocess.run(["docker", "stop", "redis-container"], capture_output=True)
    subprocess.run(["docker", "rm", "redis-container"], capture_output=True)
    print("✓ Redis stopped")
    
    print("[2/3] Terminating all processes...")
    # Kill all child processes
    for proc in processes:
        try:
            proc.terminate()
            print(f"  Terminated process: {proc.pid}")
        except:
            pass
        
        try:
            proc.kill()
            print(f"  Killed process: {proc.pid}")
        except:
            pass
    
    # Also kill any remaining node, python, docker processes
    subprocess.run("taskkill /F /IM node.exe", shell=True, capture_output=True)
    subprocess.run("taskkill /F /IM python.exe", shell=True, capture_output=True)
    subprocess.run("taskkill /F /IM cmd.exe", shell=True, capture_output=True)
    
    print("✓ All processes terminated")
    
    print("[3/3] Cleanup complete")
    print("\n" + "="*50)
    print("ALL APPLICATIONS SHUT DOWN SUCCESSFULLY!")
    print("="*50)
    sys.exit(0)

def force_shutdown():
    subprocess.run("taskkill /F /IM node.exe", shell=True, capture_output=True)
    subprocess.run("taskkill /F /IM python.exe", shell=True, capture_output=True)
    subprocess.run("taskkill /F /IM cmd.exe", shell=True, capture_output=True)
    subprocess.run(["docker", "rm", "-f", "redis-container"], capture_output=True)
    print("All processes killed!")
    sys.exit(1)

def open_chrome_with_url(url, delay=5):
    print(f"Opening Chrome to {url} in {delay} seconds...")
    time.sleep(delay)
    webbrowser.open(url)

def run_command_in_terminal(title, command, working_dir=None):
    """Run a command in a new terminal window and return the process"""
    if working_dir:
        cmd = f'start "{title}" cmd /c "cd /d {working_dir} && {command} && pause"'
    else:
        cmd = f'start "{title}" cmd /c "{command} && pause"'
    
    # Use CREATE_NEW_CONSOLE flag to create a new window
    process = subprocess.Popen(
        cmd,
        shell=True,
        creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == 'win32' else 0
    )
    return process

def main():
    global processes
    signal.signal(signal.SIGINT, signal_handler)
    
    print("="*60)
    print("🚀 STARTING APPLICATION LAUNCHER")
    print("="*60)
    print(f"📁 Directory: {MAIN_APP_DIR}")
    print("\n⚠️  PRESS Ctrl+C TO CLOSE ALL TERMINALS AND SHUTDOWN ⚠️")
    print("="*60 + "\n")
    
    # Start Redis (runs directly, no new window needed since it's Docker)
    print("[1/4] Starting Redis...")
    redis_process = subprocess.Popen(
        ["docker", "run", "--rm", "--name", "redis-container", "-p", "6379:6379", "redis"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    processes.append(redis_process)
    print(f"   Redis started with PID: {redis_process.pid}")
    time.sleep(3)
    
    # Start Django
    print("[2/4] Starting Django...")
    django_process = subprocess.Popen(
        f'start "Django" cmd /c "cd /d {MAIN_APP_DIR}\\backend && python manage.py runserver"',
        # f'start "Django" cmd /c "cd /d {MAIN_APP_DIR}\\backend && python manage.py runserver 0.0.0.0:8000"',
        shell=True
    )
    processes.append(django_process)
    print(f"   Django started")
    time.sleep(3)
    
    # Start Frontend
    print("[3/4] Starting Frontend...")
    frontend_process = subprocess.Popen(
        f'start "Frontend" cmd /c "cd /d {MAIN_APP_DIR}\\frontend && npm run dev"',
        shell=True
    )
    processes.append(frontend_process)
    print(f"   Frontend started")
    time.sleep(3)
    
    # Start Vision
    print("[4/4] Starting Vision...")
    vision_process = subprocess.Popen(
        f'start "Vision" cmd /c "cd /d {MAIN_APP_DIR} && python -m vision.main"',
        shell=True
    )
    processes.append(vision_process)
    print(f"   Vision started")
    
    # Open browser
    print("\n[5/5] Opening browser...")
    threading.Thread(target=open_chrome_with_url, args=(CUSTOM_URL, 5), daemon=True).start()
    
    print("\n" + "="*60)
    print("✅ ALL SYSTEMS OPERATIONAL")
    print("="*60)
    print(f"🌐 Browser will open to: {CUSTOM_URL}")
    print(f"📊 Tracking {len(processes)} processes")
    print("🔴 PRESS Ctrl+C TO CLOSE EVERYTHING 🔴")
    print("="*60 + "\n")
    
    # Keep alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)

if __name__ == "__main__":
    main()