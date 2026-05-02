import os

# File extensions we want to count
TARGET_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx"}

def count_lines_in_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except:
        return 0

def scan_directory(path):
    results = []
    total = 0

    for root, dirs, files in os.walk(path):
        for file in files:
            _, ext = os.path.splitext(file)
            if ext.lower() in TARGET_EXTENSIONS:
                full_path = os.path.join(root, file)
                line_count = count_lines_in_file(full_path)
                results.append((full_path, line_count))
                total += line_count

    return results, total

def main():
    base = input("Enter the base directory path: ").strip()

    subdirs = [
        "backend",
        "frontend/src",
        "vision"
    ]
    
    all_lines = 0

    for sub in subdirs:
        print("\n===============================")
        print(f"Scanning: {sub}")
        print("===============================")

        full_path = os.path.join(base, sub)

        if not os.path.exists(full_path):
            print(f"Directory not found: {full_path}")
            continue

        files, total_lines = scan_directory(full_path)

        for fpath, lines in files:
            print(f"{lines:6} lines  |  {fpath}")

        all_lines += total_lines
        print(f"\nTotal lines in {sub}: {total_lines}")

    print(f'all lines: {all_lines}')
    
if __name__ == "__main__":
    main()
