import subprocess
import signal
import sys
import os
import time
import json
import tempfile
import webbrowser

MAIN_APP_DIR = r"C:\mahmood\pld"
shutdown_requested = False

# Or add any custom URL
CUSTOM_URL = "http://localhost:3000/report/gate"     # Change this to your desired URL

def signal_handler(sig, frame):
    global shutdown_requested
    if shutdown_requested:
        print("\nForce shutdown requested - Terminating all processes...")
        force_shutdown()
    else:
        print("\n\n" + "="*50)
        print("SHUTDOWN SEQUENCE INITIATED - Press Ctrl+C again for force shutdown")
        print("="*50)
        shutdown_requested = True
        graceful_shutdown()

def graceful_shutdown():
    print("\n[1/2] Stopping Redis container...")
    subprocess.run(["docker", "stop", "redis-container"], capture_output=True)
    subprocess.run(["docker", "rm", "redis-container"], capture_output=True)
    print("✓ Redis stopped")
    
    print("[2/2] Closing Windows Terminal...")
    subprocess.run(["taskkill", "/F", "/IM", "WindowsTerminal.exe"], capture_output=True)
    print("✓ All tabs closed")
    
    print("\n" + "="*50)
    print("ALL APPLICATIONS SHUT DOWN SUCCESSFULLY!")
    print("="*50)
    sys.exit(0)

def force_shutdown():
    subprocess.run(["taskkill", "/F", "/IM", "WindowsTerminal.exe"], capture_output=True)
    subprocess.run(["docker", "rm", "-f", "redis-container"], capture_output=True)
    print("All processes killed!")
    sys.exit(1)

def open_chrome_with_url(url, delay=5):
    """Open Chrome with the specified URL after a delay"""
    print(f"Will open Chrome to {url} in {delay} seconds...")
    time.sleep(delay)
    
    # Method 1: Using webbrowser module (opens default browser)
    webbrowser.open(url)
    
    # Method 2: Specifically open Chrome (uncomment if you want Chrome specifically)
    # chrome_path = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    # subprocess.Popen([chrome_path, url])

def main():
    signal.signal(signal.SIGINT, signal_handler)
    
    print("="*50)
    print(f"Starting ALL applications from: {MAIN_APP_DIR}")
    print("="*50)
    print("\n[TIP] Press Ctrl+C to shutdown gracefully")
    print("[TIP] Press Ctrl+C twice for force shutdown\n")
    
    # Build Windows Terminal command with multiple tabs
    wt_command = [
        "wt",
        "new-tab", "--title", "Redis", "cmd", "/k", f"docker run --rm --name redis-container -p 6379:6379 redis",
        ";",
        "new-tab", "--title", "Frontend", "cmd", "/k", f"cd /d {MAIN_APP_DIR}\\frontend && npm run dev",
        ";",
        "new-tab", "--title", "Django", "cmd", "/k", f"cd /d {MAIN_APP_DIR}\\backend && python manage.py runserver",
        ";",
        "new-tab", "--title", "Vision", "cmd", "/k", f"cd /d {MAIN_APP_DIR} && python -m vision.main"
    ]
    
    # Start Windows Terminal with all tabs
    print("[1/5] Starting Redis...")
    print("[2/5] Starting Frontend...")
    print("[3/5] Starting Django...")
    print("[4/5] Starting Vision...")
    
    subprocess.Popen(wt_command, shell=True)
    
    # Open Chrome after a delay (wait for servers to start)
    print("[5/5] Preparing to open Chrome...")
    
    # You can choose when to open Chrome
    # Option A: Open after all servers start (recommended)
    threading.Thread(target=open_chrome_with_url, args=(CUSTOM_URL, 1), daemon=True).start()
    
    
    print("\n" + "="*50)
    print("ALL APPS STARTED in Windows Terminal tabs!")
    print("="*50)
    print(f"\n🌐 Chrome will open to {CUSTOM_URL} automatically in a few seconds")
    print("📌 Press Ctrl+C in THIS window to shutdown all apps\n")
    
    # Keep the script running
    while True:
        time.sleep(1)

if __name__ == "__main__":
    import threading
    main()